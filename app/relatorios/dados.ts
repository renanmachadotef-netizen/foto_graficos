import { prisma } from "@/lib/prisma";
import { rotuloPagamento } from "@/lib/pagamentos";

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type Periodo = "hoje" | "7d" | "30d" | "mes" | "mes-passado";

export const PERIODOS: { v: Periodo; l: string }[] = [
  { v: "hoje", l: "Hoje" },
  { v: "7d", l: "7 dias" },
  { v: "30d", l: "30 dias" },
  { v: "mes", l: "Este mês" },
  { v: "mes-passado", l: "Mês passado" },
];

/** Dia no horario de Brasilia (a loja e em Santa Catarina), no formato AAAA-MM-DD. */
export function diaBR(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function somaDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaBR(d);
}

export function intervalo(p: Periodo, hoje = diaBR(new Date())): { de: string; ate: string } {
  const [a, m] = hoje.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (p) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "7d":
      return { de: somaDias(hoje, -6), ate: hoje };
    case "30d":
      return { de: somaDias(hoje, -29), ate: hoje };
    case "mes":
      return { de: `${a}-${pad(m)}-01`, ate: hoje };
    case "mes-passado": {
      const ma = m === 1 ? 12 : m - 1;
      const aa = m === 1 ? a - 1 : a;
      const ultimo = new Date(Date.UTC(aa, ma, 0)).getUTCDate();
      return { de: `${aa}-${pad(ma)}-01`, ate: `${aa}-${pad(ma)}-${pad(ultimo)}` };
    }
  }
}

function limites(de: string, ate: string) {
  return { ini: new Date(`${de}T00:00:00-03:00`), fim: new Date(new Date(`${ate}T00:00:00-03:00`).getTime() + 86400000) };
}

export interface Resumo {
  faturamento: number;
  vendas: number;
  ticket: number;
  lucro: number;
  margem: number | null;
  fiadoVendido: number;
  fiadoRecebido: number;
  porDia: { dia: string; total: number; vendas: number }[];
  maiorDia: { dia: string; total: number } | null;
  menorDia: { dia: string; total: number } | null;
}

async function vendasDoPeriodo(de: string, ate: string) {
  const { ini, fim } = limites(de, ate);
  return prisma.quote.findMany({
    where: { isPosSale: true, status: "APPROVED", createdAt: { gte: ini, lt: fim } },
    select: {
      id: true,
      createdAt: true,
      finalPrice: true,
      totalCost: true,
      clientId: true,
      client: { select: { name: true } },
      items: { select: { description: true, productId: true, quantity: true, unitCost: true, unitPrice: true } },
    },
  });
}

export async function resumo(de: string, ate: string): Promise<Resumo> {
  const { ini, fim } = limites(de, ate);
  const [vendas, fiadoNovo, recebido] = await Promise.all([
    vendasDoPeriodo(de, ate),
    prisma.financialTransaction.aggregate({
      where: { type: "INCOME", status: { in: ["PENDING", "PAID"] }, category: "Fiado", createdAt: { gte: ini, lt: fim } },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { type: "INCOME", status: "PAID", category: { startsWith: "Fiado" }, paymentDate: { gte: ini, lt: fim } },
      _sum: { amount: true },
    }),
  ]);

  const mapa = new Map<string, { total: number; vendas: number }>();
  // todos os dias do periodo aparecem, mesmo sem venda
  for (let d = de; d <= ate; d = somaDias(d, 1)) mapa.set(d, { total: 0, vendas: 0 });
  let faturamento = 0;
  let custo = 0;
  for (const v of vendas) {
    faturamento += v.finalPrice;
    custo += v.totalCost;
    const dia = diaBR(v.createdAt);
    const x = mapa.get(dia) ?? { total: 0, vendas: 0 };
    x.total = r2(x.total + v.finalPrice);
    x.vendas += 1;
    mapa.set(dia, x);
  }
  const porDia = [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([dia, x]) => ({ dia, ...x }));
  const comVenda = porDia.filter((d) => d.vendas > 0);
  const maior = comVenda.length ? comVenda.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const menor = comVenda.length ? comVenda.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  faturamento = r2(faturamento);
  const lucro = r2(faturamento - custo);
  return {
    faturamento,
    vendas: vendas.length,
    ticket: vendas.length ? r2(faturamento / vendas.length) : 0,
    lucro,
    margem: faturamento > 0 && custo > 0 ? (lucro / faturamento) * 100 : null,
    fiadoVendido: r2(fiadoNovo._sum.amount ?? 0),
    fiadoRecebido: r2(recebido._sum.amount ?? 0),
    porDia,
    maiorDia: maior ? { dia: maior.dia, total: maior.total } : null,
    menorDia: menor ? { dia: menor.dia, total: menor.total } : null,
  };
}

export interface LinhaLucro {
  nome: string;
  quantidade: number;
  receita: number;
  custo: number;
  lucro: number;
  semCusto: boolean;
}

/** Lucro por produto: o desconto da venda e dividido entre os itens na proporcao do valor de cada um. */
export async function lucratividade(de: string, ate: string): Promise<LinhaLucro[]> {
  const vendas = await vendasDoPeriodo(de, ate);
  const mapa = new Map<string, LinhaLucro>();
  for (const v of vendas) {
    const bruto = v.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const fator = bruto > 0 ? v.finalPrice / bruto : 1;
    for (const i of v.items) {
      const chave = i.productId ?? `avulso:${i.description}`;
      const nome = i.description.replace(/\s*\(.*\)\s*$/, "");
      const x = mapa.get(chave) ?? { nome, quantidade: 0, receita: 0, custo: 0, lucro: 0, semCusto: false };
      x.quantidade += i.quantity;
      x.receita += i.quantity * i.unitPrice * fator;
      x.custo += i.quantity * i.unitCost;
      if (!(i.unitCost > 0)) x.semCusto = true;
      mapa.set(chave, x);
    }
  }
  return [...mapa.values()]
    .map((x) => ({ ...x, quantidade: Math.round(x.quantidade * 1000) / 1000, receita: r2(x.receita), custo: r2(x.custo), lucro: r2(x.receita - x.custo) }))
    .sort((a, b) => b.lucro - a.lucro);
}

export interface LinhaForma {
  forma: string;
  valor: number;
  qtd: number;
}

export async function porFormaPagamento(de: string, ate: string): Promise<{ linhas: LinhaForma[]; abertos: number; valorAberto: number }> {
  const { ini, fim } = limites(de, ate);
  const [pagos, abertos] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { type: "INCOME", status: "PAID", paymentDate: { gte: ini, lt: fim }, quote: { isPosSale: true, status: { not: "CANCELLED" } } },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.quote.findMany({ where: { isPosSale: true, status: "OPEN", createdAt: { gte: ini, lt: fim } }, select: { finalPrice: true } }),
  ]);
  const mapa = new Map<string, LinhaForma>();
  for (const t of pagos) {
    const forma = rotuloPagamento(t.paymentMethod) || "Sem forma";
    const x = mapa.get(forma) ?? { forma, valor: 0, qtd: 0 };
    x.valor = r2(x.valor + t.amount);
    x.qtd += 1;
    mapa.set(forma, x);
  }
  return {
    linhas: [...mapa.values()].sort((a, b) => b.valor - a.valor),
    abertos: abertos.length,
    valorAberto: r2(abertos.reduce((s, q) => s + q.finalPrice, 0)),
  };
}

export interface LinhaCliente {
  nome: string;
  compras: number;
  total: number;
  deve: number;
}

export async function rankingClientes(de: string, ate: string): Promise<LinhaCliente[]> {
  const vendas = await vendasDoPeriodo(de, ate);
  const mapa = new Map<string, { nome: string; compras: number; total: number }>();
  for (const v of vendas) {
    if (v.client.name === "Cliente Balcão") continue;
    const x = mapa.get(v.clientId) ?? { nome: v.client.name, compras: 0, total: 0 };
    x.compras += 1;
    x.total = r2(x.total + v.finalPrice);
    mapa.set(v.clientId, x);
  }
  const top = [...mapa.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 50);
  const deve = top.length
    ? await prisma.financialTransaction.groupBy({
        by: ["clientId"],
        where: { clientId: { in: top.map(([id]) => id) }, type: "INCOME", status: "PENDING" },
        _sum: { amount: true },
      })
    : [];
  const dm = new Map(deve.map((d) => [d.clientId, d._sum.amount ?? 0]));
  return top.map(([id, x]) => ({ ...x, deve: r2(dm.get(id) ?? 0) }));
}
