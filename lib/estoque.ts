import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

export type TipoMovimento = "initial" | "sale" | "cancel" | "entry" | "adjust";

/**
 * Muda o estoque de um produto e grava a linha no historico.
 * So mexe em produto que controla estoque; para os outros nao faz nada.
 */
export async function moverEstoque(
  tx: Tx,
  productId: string,
  kind: TipoMovimento,
  delta: number,
  extra: { quoteId?: string | null; unitCost?: number | null; notes?: string | null; quem?: string | null } = {},
) {
  const p = await tx.product.findUnique({ where: { id: productId }, select: { trackStock: true, stockQty: true } });
  if (!p || !p.trackStock) return null;
  const depois = r3(p.stockQty + delta);
  await tx.product.update({
    where: { id: productId },
    data: { stockQty: depois, ...(extra.unitCost != null && kind === "entry" ? { cost: extra.unitCost } : {}) },
  });
  return tx.productStockMove.create({
    data: {
      productId,
      kind,
      qtyDelta: r3(delta),
      qtyAfter: depois,
      quoteId: extra.quoteId ?? null,
      unitCost: extra.unitCost ?? null,
      notes: extra.notes?.trim().slice(0, 200) || null,
      createdBy: extra.quem ?? null,
    },
  });
}

/** Baixa o estoque dos itens de uma venda que acabou de ser fechada. */
export async function baixarVenda(
  tx: Tx,
  quoteId: string,
  itens: { productId?: string | null; quantity: number }[],
  quem: string | null,
) {
  const porProduto = new Map<string, number>();
  for (const i of itens) {
    if (i.productId) porProduto.set(i.productId, (porProduto.get(i.productId) ?? 0) + i.quantity);
  }
  for (const [productId, qtd] of porProduto) {
    await moverEstoque(tx, productId, "sale", -qtd, { quoteId, quem });
  }
}

/** Devolve ao estoque o que a venda tinha baixado (cancelamento). Usa o historico, nao os itens, para nao devolver duas vezes. */
export async function devolverVenda(tx: Tx, quoteId: string, motivo: string, quem: string | null) {
  const moves = await tx.productStockMove.findMany({ where: { quoteId, kind: { in: ["sale", "cancel"] } } });
  const saldo = new Map<string, number>();
  for (const m of moves) saldo.set(m.productId, (saldo.get(m.productId) ?? 0) + m.qtyDelta);
  for (const [productId, delta] of saldo) {
    if (delta < 0) await moverEstoque(tx, productId, "cancel", -delta, { quoteId, notes: motivo, quem });
  }
}
