"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rotuloPagamento } from "@/lib/pagamentos";
import { revalidatePath } from "next/cache";

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

async function sessao() {
  const s = await getSession();
  return s && ["ADMIN", "MANAGER", "SELLER"].includes(s.role) ? s : null;
}

/** Limites do dia no horario de Brasilia (a loja e em Santa Catarina). */
function limites(deYmd: string, ateYmd: string) {
  const ini = new Date(`${deYmd}T00:00:00-03:00`);
  const fim = new Date(new Date(`${ateYmd}T00:00:00-03:00`).getTime() + 86400000);
  return { ini, fim };
}

export interface VendaLinha {
  id: string;
  numero: number | null;
  criada: string; // ISO
  status: "APPROVED" | "OPEN" | "CANCELLED";
  clienteNome: string;
  clienteTelefone: string | null;
  balcao: boolean;
  vendedor: string | null;
  total: number;
  desconto: number;
  pago: number; // dinheiro que ja entrou
  fiado: number; // ficou devendo
  falta: number; // pedido em aberto: ainda falta receber
  itens: { nome: string; quantidade: number; unitario: number; total: number }[];
  pagamentos: { forma: string; valor: number; situacao: "PAID" | "PENDING" | "CANCELLED" }[];
  notes: string | null;
  cancelada: { em: string; motivo: string | null; por: string | null } | null;
  emProducao: boolean;
}

export interface ResumoCaixa {
  entrouNoCaixa: number;
  porForma: { forma: string; valor: number }[];
  fiadoRecebido: number;
  fiadoNovo: number;
}

export async function listarVendas(deYmd: string, ateYmd: string): Promise<{ vendas: VendaLinha[]; caixa: ResumoCaixa } | null> {
  if (!(await sessao())) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(ateYmd)) return null;
  const { ini, fim } = limites(deYmd, ateYmd);

  const [qs, recebido, fiadoNovo] = await Promise.all([
    prisma.quote.findMany({
      where: { isPosSale: true, createdAt: { gte: ini, lt: fim } },
      orderBy: { createdAt: "desc" },
      take: 600,
      include: {
        client: { select: { name: true, phone: true } },
        seller: { select: { name: true } },
        items: true,
        transactions: { where: { type: "INCOME" }, orderBy: { createdAt: "asc" } },
        serviceOrder: { select: { status: true } },
      },
    }),
    // o que entrou no caixa no periodo (qualquer venda, inclusive fiado recebido hoje)
    prisma.financialTransaction.findMany({
      where: { type: "INCOME", status: "PAID", paymentDate: { gte: ini, lt: fim } },
      select: { amount: true, paymentMethod: true, category: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { type: "INCOME", status: "PENDING", category: "Fiado", createdAt: { gte: ini, lt: fim } },
      _sum: { amount: true },
    }),
  ]);

  const vendas: VendaLinha[] = qs.map((q) => {
    const itens = q.items.map((i) => ({
      nome: i.description,
      quantidade: i.quantity,
      unitario: i.unitPrice,
      total: r2(i.quantity * i.unitPrice),
    }));
    const bruto = r2(itens.reduce((s, i) => s + i.total, 0));
    const ativas = q.transactions.filter((t) => t.status !== "CANCELLED");
    const pago = r2(ativas.filter((t) => t.status === "PAID").reduce((s, t) => s + t.amount, 0));
    const fiado = r2(ativas.filter((t) => t.status === "PENDING").reduce((s, t) => s + t.amount, 0));
    return {
      id: q.id,
      numero: q.number,
      criada: q.createdAt.toISOString(),
      status: (q.status === "APPROVED" || q.status === "OPEN" || q.status === "CANCELLED" ? q.status : "APPROVED") as VendaLinha["status"],
      clienteNome: q.client.name,
      clienteTelefone: q.client.phone,
      balcao: q.client.name === "Cliente Balcão",
      vendedor: q.seller?.name ?? null,
      total: q.finalPrice,
      desconto: r2(Math.max(0, bruto - q.finalPrice)),
      pago,
      fiado,
      falta: q.status === "OPEN" ? r2(Math.max(0, q.finalPrice - pago - fiado)) : 0,
      itens,
      pagamentos: q.transactions.map((t) => ({
        forma: t.category === "Fiado" ? "Fiado" : rotuloPagamento(t.paymentMethod) || "—",
        valor: t.amount,
        situacao: (t.status === "PAID" || t.status === "PENDING" || t.status === "CANCELLED" ? t.status : "PAID") as "PAID" | "PENDING" | "CANCELLED",
      })),
      notes: q.notes,
      cancelada: q.status === "CANCELLED" ? { em: (q.cancelledAt ?? q.updatedAt).toISOString(), motivo: q.cancelReason, por: q.cancelledBy } : null,
      emProducao: !!q.serviceOrder && q.serviceOrder.status !== "WAITING",
    };
  });

  const porFormaMap = new Map<string, number>();
  let fiadoRecebido = 0;
  for (const t of recebido) {
    const forma = rotuloPagamento(t.paymentMethod) || "Sem forma";
    porFormaMap.set(forma, r2((porFormaMap.get(forma) ?? 0) + t.amount));
    if (t.category?.startsWith("Fiado")) fiadoRecebido = r2(fiadoRecebido + t.amount);
  }
  const porForma = [...porFormaMap.entries()].map(([forma, valor]) => ({ forma, valor })).sort((a, b) => b.valor - a.valor);

  return {
    vendas,
    caixa: {
      entrouNoCaixa: r2(porForma.reduce((s, f) => s + f.valor, 0)),
      porForma,
      fiadoRecebido,
      fiadoNovo: r2(fiadoNovo._sum.amount ?? 0),
    },
  };
}

/** Cancela uma venda ou pedido. Nada e apagado: fica marcado como cancelado, com motivo e quem fez. */
export async function cancelarVenda(id: string, motivo: string): Promise<{ ok: true; aviso?: string } | { ok: false; erro: string }> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Voce nao tem permissao." };
  const razao = motivo.trim();
  if (razao.length < 3) return { ok: false, erro: "Escreva o motivo do cancelamento." };

  const q = await prisma.quote.findUnique({
    where: { id },
    include: { transactions: { select: { status: true, amount: true } }, serviceOrder: { select: { id: true, status: true } } },
  });
  if (!q || !q.isPosSale) return { ok: false, erro: "Venda nao encontrada." };
  if (q.status === "CANCELLED") return { ok: false, erro: "Essa venda ja foi cancelada." };

  const temPagamento = q.transactions.some((t) => t.status === "PAID");
  const gerente = s.role === "ADMIN" || s.role === "MANAGER";
  if (!gerente && (q.status === "APPROVED" || temPagamento)) {
    return { ok: false, erro: "Venda ja paga so o gerente ou o administrador pode cancelar. Chame ele para ajudar." };
  }

  const quem = s.name;
  await prisma.$transaction(async (tx) => {
    await tx.financialTransaction.updateMany({ where: { quoteId: id, status: { in: ["PAID", "PENDING"] } }, data: { status: "CANCELLED" } });
    await tx.quote.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: razao, cancelledBy: quem },
    });
    if (q.serviceOrder && q.serviceOrder.status === "WAITING") await tx.serviceOrder.delete({ where: { id: q.serviceOrder.id } });
  });

  revalidatePath("/vendas");
  revalidatePath("/pdv");
  revalidatePath("/receber");
  revalidatePath("/financial");
  revalidatePath("/pcp");
  revalidatePath("/");
  const aviso = q.serviceOrder && q.serviceOrder.status !== "WAITING" ? "Atenção: esse trabalho já estava em produção. Avise a produção." : undefined;
  return { ok: true, aviso };
}
