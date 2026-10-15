"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

export async function saveQuote(data: any) {

  const quote = await prisma.quote.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      totalCost: data.totalCost,
      markup: data.markup,
      finalPrice: data.finalPrice,
      taxRate: data.taxRate || 0,
      cardFeeRate: data.cardFeeRate || 0,
      netProfit: data.netProfit || 0,
      items: {
        create: data.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/quotes");
  return quote.id;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INI = "[ESCALA]";
const FIM = "[/ESCALA]";

export type EscalaLinha = { qtd: number; custoUnit: number; precoUnit: number };

export type ResultadoProduto = { ok: true; id: string; nome: string; criado: boolean } | { ok: false; erro: string };

/**
 * Grava no produto o custo de 1 unidade (com todo o setup) e, se pedido, o preco de 1 unidade.
 * A tabela de precos por quantidade vai na observacao do produto, entre marcas, e e reescrita a cada atualizacao.
 */
export async function salvarNoProduto(d: {
  productId: string | null;
  nome: string;
  categoria: string;
  custoUnit: number;
  precoUnit: number;
  atualizarPreco: boolean;
  escala: EscalaLinha[];
}): Promise<ResultadoProduto> {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER"].includes(s.role)) return { ok: false, erro: "So gerente ou administrador pode alterar produtos." };
  const nome = d.nome.trim();
  if (!nome) return { ok: false, erro: "Escreva o nome do produto." };
  if (!(d.custoUnit > 0)) return { ok: false, erro: "Monte a receita (materiais e etapas) antes: o custo calculado esta zerado." };

  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = d.escala
    .filter((e) => e.qtd >= 1 && e.precoUnit > 0)
    .map((e) => `${e.qtd} un: ${brl(r2(e.precoUnit))} cada (custo ${brl(r2(e.custoUnit))})`)
    .join(" | ");
  const bloco = `${INI} Calculadora em ${hoje} — ${linhas} ${FIM}`;
  const mescla = (antiga: string | null) => {
    const base = (antiga ?? "").replace(/\s*\[ESCALA\][\s\S]*?\[\/ESCALA\]/, "").trim();
    return base ? `${base}\n${bloco}` : bloco;
  };

  if (d.productId) {
    const p = await prisma.product.findUnique({ where: { id: d.productId }, select: { id: true, name: true, description: true } });
    if (!p) return { ok: false, erro: "Produto nao encontrado." };
    await prisma.product.update({
      where: { id: p.id },
      data: {
        cost: r2(d.custoUnit),
        ...(d.atualizarPreco && d.precoUnit > 0 ? { price: r2(d.precoUnit) } : {}),
        description: mescla(p.description),
      },
    });
    revalidatePath("/pdv");
    return { ok: true, id: p.id, nome: p.name, criado: false };
  }

  if (!(d.precoUnit > 0)) return { ok: false, erro: "Produto novo precisa de preco de venda." };
  const novo = await prisma.product.create({
    data: { name: nome, category: d.categoria.trim() || "OUTROS", price: r2(d.precoUnit), cost: r2(d.custoUnit), description: bloco },
  });
  revalidatePath("/pdv");
  return { ok: true, id: novo.id, nome: novo.name, criado: true };
}
