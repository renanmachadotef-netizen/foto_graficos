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

export interface MovimentoCaixa {
  id: string;
  type: "SANGRIA" | "SUPRIMENTO";
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface CaixaAberto {
  id: string;
  abertoEm: string;
  abertoPor: string;
  troco: number;
  vendasDinheiro: number;
  pagamentosDinheiro: number; // contas pagas em dinheiro
  suprimentos: number;
  sangrias: number;
  esperado: number; // dinheiro que deve estar na gaveta agora
  outrasFormas: { forma: string; valor: number }[];
  movimentos: MovimentoCaixa[];
}

export interface CaixaFechado {
  id: string;
  abertoEm: string;
  fechadoEm: string;
  abertoPor: string;
  fechadoPor: string;
  troco: number;
  esperado: number;
  contado: number;
  diferenca: number;
  notes: string | null;
}

export interface EstadoCaixa {
  aberto: CaixaAberto | null;
  historico: CaixaFechado[];
}

/** Soma o que mexeu no dinheiro da gaveta entre duas datas. */
async function apurar(de: Date, ate: Date) {
  const [entradas, saidas] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { type: "INCOME", status: "PAID", paymentDate: { gte: de, lte: ate } },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.financialTransaction.findMany({
      where: { type: "EXPENSE", status: "PAID", paymentMethod: "CASH", paymentDate: { gte: de, lte: ate } },
      select: { amount: true },
    }),
  ]);
  let dinheiro = 0;
  const outras = new Map<string, number>();
  for (const t of entradas) {
    if (t.paymentMethod === "CASH") dinheiro += t.amount;
    else {
      const f = rotuloPagamento(t.paymentMethod) || "Sem forma";
      outras.set(f, (outras.get(f) ?? 0) + t.amount);
    }
  }
  return {
    vendasDinheiro: r2(dinheiro),
    pagamentosDinheiro: r2(saidas.reduce((s, t) => s + t.amount, 0)),
    outrasFormas: [...outras.entries()].map(([forma, valor]) => ({ forma, valor: r2(valor) })).sort((a, b) => b.valor - a.valor),
  };
}

export async function estadoCaixa(): Promise<EstadoCaixa | null> {
  if (!(await sessao())) return null;
  const [aberta, fechadas] = await Promise.all([
    prisma.cashSession.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" }, include: { movements: { orderBy: { createdAt: "asc" } } } }),
    prisma.cashSession.findMany({ where: { closedAt: { not: null } }, orderBy: { closedAt: "desc" }, take: 30 }),
  ]);

  let aberto: CaixaAberto | null = null;
  if (aberta) {
    const ap = await apurar(aberta.openedAt, new Date());
    const suprimentos = r2(aberta.movements.filter((m) => m.type === "SUPRIMENTO").reduce((s, m) => s + m.amount, 0));
    const sangrias = r2(aberta.movements.filter((m) => m.type === "SANGRIA").reduce((s, m) => s + m.amount, 0));
    aberto = {
      id: aberta.id,
      abertoEm: aberta.openedAt.toISOString(),
      abertoPor: aberta.openedBy,
      troco: aberta.openingAmount,
      ...ap,
      suprimentos,
      sangrias,
      esperado: r2(aberta.openingAmount + ap.vendasDinheiro - ap.pagamentosDinheiro + suprimentos - sangrias),
      movimentos: aberta.movements.map((m) => ({
        id: m.id,
        type: m.type as "SANGRIA" | "SUPRIMENTO",
        amount: m.amount,
        reason: m.reason,
        createdBy: m.createdBy,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  return {
    aberto,
    historico: fechadas.map((c) => ({
      id: c.id,
      abertoEm: c.openedAt.toISOString(),
      fechadoEm: (c.closedAt ?? c.openedAt).toISOString(),
      abertoPor: c.openedBy,
      fechadoPor: c.closedBy ?? "",
      troco: c.openingAmount,
      esperado: c.expectedCash ?? 0,
      contado: c.countedCash ?? 0,
      diferenca: c.difference ?? 0,
      notes: c.notes,
    })),
  };
}

type Res = { ok: true } | { ok: false; erro: string };

function valorOk(v: number, minimo = 0) {
  return Number.isFinite(v) && v >= minimo && v < 1_000_000;
}

export async function abrirCaixa(troco: number): Promise<Res> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Voce nao tem permissao." };
  if (!valorOk(troco)) return { ok: false, erro: "Informe o valor do troco inicial (pode ser 0)." };
  if (await prisma.cashSession.findFirst({ where: { closedAt: null } })) return { ok: false, erro: "O caixa ja esta aberto." };
  await prisma.cashSession.create({ data: { openedBy: s.name, openingAmount: r2(troco) } });
  revalidatePath("/caixa");
  return { ok: true };
}

export async function movimentarCaixa(tipo: "SANGRIA" | "SUPRIMENTO", valor: number, motivo: string): Promise<Res> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Voce nao tem permissao." };
  if (tipo !== "SANGRIA" && tipo !== "SUPRIMENTO") return { ok: false, erro: "Tipo invalido." };
  if (!valorOk(valor, 0.01)) return { ok: false, erro: "Informe um valor maior que zero." };
  if (motivo.trim().length < 3) return { ok: false, erro: "Escreva o motivo." };
  const aberta = await prisma.cashSession.findFirst({ where: { closedAt: null } });
  if (!aberta) return { ok: false, erro: "Abra o caixa primeiro." };
  await prisma.cashMovement.create({ data: { sessionId: aberta.id, type: tipo, amount: r2(valor), reason: motivo.trim(), createdBy: s.name } });
  revalidatePath("/caixa");
  return { ok: true };
}

export async function fecharCaixa(contado: number, obs: string): Promise<Res> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Voce nao tem permissao." };
  if (!valorOk(contado)) return { ok: false, erro: "Informe quanto dinheiro tem na gaveta (pode ser 0)." };
  const estado = await estadoCaixa();
  if (!estado?.aberto) return { ok: false, erro: "Nao ha caixa aberto." };
  const esperado = estado.aberto.esperado;
  const dif = r2(contado - esperado);
  if (dif !== 0 && obs.trim().length < 3) return { ok: false, erro: "Tem diferenca no caixa: escreva uma observacao explicando." };
  await prisma.cashSession.update({
    where: { id: estado.aberto.id },
    data: { closedAt: new Date(), closedBy: s.name, expectedCash: esperado, countedCash: r2(contado), difference: dif, notes: obs.trim() || null },
  });
  revalidatePath("/caixa");
  return { ok: true };
}
