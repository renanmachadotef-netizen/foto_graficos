import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rotuloPagamento } from "@/lib/pagamentos";

export const dynamic = "force-dynamic";

/** CSV para o Excel em portugues: BOM, ponto e virgula, virgula decimal. Texto que comeca com = + - @ ganha apostrofo (nao vira formula). */
function celula(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (typeof v === "number") return String(Math.round(v * 1000) / 1000).replace(".", ",");
  if (typeof v === "boolean") return v ? "sim" : "nao";
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
function csv(cab: string[], linhas: unknown[][]): string {
  return "﻿" + [cab, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
}

const TIPOS: Record<string, { arquivo: string; gerar: () => Promise<string> }> = {
  clientes: {
    arquivo: "clientes",
    gerar: async () => {
      const l = await prisma.client.findMany({ orderBy: { name: "asc" } });
      return csv(
        ["Nome", "Codigo", "CPF/CNPJ", "Telefone", "E-mail", "Endereco", "Nascimento", "Limite do fiado", "Situacao", "Observacao"],
        l.map((c) => [c.name, c.code, c.document, c.phone, c.email, c.address, c.birthDate ? c.birthDate.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "", c.creditLimit, c.status, c.notes]),
      );
    },
  },
  produtos: {
    arquivo: "produtos",
    gerar: async () => {
      const l = await prisma.product.findMany({ orderBy: { name: "asc" } });
      return csv(
        ["Nome", "Codigo", "Categoria", "Unidade", "Preco", "Custo", "Marca", "Ativo", "Controla estoque", "Estoque"],
        l.map((p) => [p.name, p.code, p.category, p.unit, p.price, p.cost, p.brand, p.active, p.trackStock, p.trackStock ? p.stockQty : ""]),
      );
    },
  },
  vendas: {
    arquivo: "vendas",
    gerar: async () => {
      const l = await prisma.quote.findMany({
        where: { isPosSale: true },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { name: true } }, seller: { select: { name: true } } },
      });
      const sit: Record<string, string> = { APPROVED: "Fechada", OPEN: "Pedido em aberto", CANCELLED: "Cancelada" };
      return csv(
        ["Numero", "Data", "Situacao", "Cliente", "Vendedor", "Total", "Custo", "Lucro", "Observacao", "Motivo do cancelamento"],
        l.map((q) => [q.number, q.createdAt, sit[q.status] ?? q.status, q.client.name, q.seller?.name, q.finalPrice, q.totalCost, q.netProfit, q.notes, q.cancelReason]),
      );
    },
  },
  itens: {
    arquivo: "itens-das-vendas",
    gerar: async () => {
      const l = await prisma.quoteItem.findMany({ where: { quote: { isPosSale: true } }, orderBy: { quote: { createdAt: "desc" } }, include: { quote: { select: { number: true, createdAt: true, status: true } } } });
      return csv(
        ["Venda", "Data", "Situacao", "Item", "Quantidade", "Preco unitario", "Custo unitario", "Total"],
        l.map((i) => [i.quote.number, i.quote.createdAt, i.quote.status, i.description, i.quantity, i.unitPrice, i.unitCost, Math.round(i.quantity * i.unitPrice * 100) / 100]),
      );
    },
  },
  fiado: {
    arquivo: "contas-a-receber",
    gerar: async () => {
      const l = await prisma.financialTransaction.findMany({
        where: { type: "INCOME", category: { startsWith: "Fiado" } },
        orderBy: { dueDate: "desc" },
        include: { client: { select: { name: true } } },
      });
      return csv(
        ["Cliente", "Descricao", "Valor", "Vencimento", "Situacao", "Pago em", "Forma"],
        l.map((t) => [t.client?.name, t.description, t.amount, t.dueDate, t.status === "PAID" ? "Pago" : t.status === "PENDING" ? "Em aberto" : "Cancelado", t.paymentDate, rotuloPagamento(t.paymentMethod)]),
      );
    },
  },
  contas: {
    arquivo: "contas-a-pagar",
    gerar: async () => {
      const l = await prisma.financialTransaction.findMany({ where: { type: "EXPENSE" }, orderBy: { dueDate: "desc" } });
      return csv(
        ["Descricao", "Fornecedor", "Categoria", "Valor", "Vencimento", "Situacao", "Pago em", "Forma"],
        l.map((t) => [t.description, t.supplier, t.category, t.amount, t.dueDate, t.status === "PAID" ? "Pago" : t.status === "PENDING" ? "A pagar" : "Cancelado", t.paymentDate, rotuloPagamento(t.paymentMethod)]),
      );
    },
  },
  estoque: {
    arquivo: "historico-de-estoque",
    gerar: async () => {
      const l = await prisma.productStockMove.findMany({ orderBy: { createdAt: "desc" }, take: 20000, include: { product: { select: { name: true } } } });
      const rot: Record<string, string> = { initial: "Saldo inicial", sale: "Venda", cancel: "Cancelamento", entry: "Entrada", adjust: "Ajuste" };
      return csv(
        ["Data", "Produto", "Tipo", "Variacao", "Saldo depois", "Custo", "Quem", "Observacao"],
        l.map((m) => [m.createdAt, m.product.name, rot[m.kind] ?? m.kind, m.qtyDelta, m.qtyAfter, m.unitCost, m.createdBy, m.notes]),
      );
    },
  },
};

export async function GET(_req: Request, ctx: { params: Promise<{ tipo: string }> }) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return new Response("So o administrador baixa os dados.", { status: 403 });
  const { tipo } = await ctx.params;
  const t = TIPOS[tipo];
  if (!t) return new Response("Tipo desconhecido.", { status: 404 });
  const corpo = await t.gerar();
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Response(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.arquivo}-${dia}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
