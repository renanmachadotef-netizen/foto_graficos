"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moverEstoque } from "@/lib/estoque";
import { revalidatePath } from "next/cache";

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

const UNIDADES = ["un", "m2", "cento", "milheiro", "par", "cx"];

async function gestor() {
  const s = await getSession();
  return s && ["ADMIN", "MANAGER"].includes(s.role) ? s : null;
}
async function equipe() {
  const s = await getSession();
  return s && ["ADMIN", "MANAGER", "SELLER"].includes(s.role) ? s : null;
}

export interface DadosProduto {
  id?: string;
  name: string;
  code?: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  brand?: string;
  description?: string;
  active: boolean;
  trackStock: boolean;
  stockQty?: number; // so vale ao ligar o controle de estoque pela primeira vez
}

type Res = { ok: true; id: string } | { ok: false; erro: string };

export async function salvarProduto(d: DadosProduto): Promise<Res> {
  const s = await gestor();
  if (!s) return { ok: false, erro: "So gerente ou administrador cadastra produto." };
  const name = d.name?.trim().replace(/\s+/g, " ");
  if (!name || name.length < 2) return { ok: false, erro: "Escreva o nome do produto." };
  if (!(d.price >= 0) || !(d.cost >= 0)) return { ok: false, erro: "Preco e custo nao podem ser negativos." };
  const unit = UNIDADES.includes(d.unit) ? d.unit : "un";
  const code = d.code?.trim() || null;
  if (code) {
    const igual = await prisma.product.findFirst({ where: { code, ...(d.id ? { id: { not: d.id } } : {}) }, select: { name: true } });
    if (igual) return { ok: false, erro: `O codigo ${code} ja e do produto "${igual.name}".` };
  }
  const base = {
    name,
    code,
    category: d.category?.trim() || "OUTROS",
    unit,
    price: r2(d.price),
    cost: r2(d.cost),
    brand: d.brand?.trim() || null,
    description: d.description?.trim() || null,
    active: !!d.active,
  };

  if (!d.id) {
    const p = await prisma.$transaction(async (tx) => {
      const novo = await tx.product.create({ data: { ...base, trackStock: false, stockQty: 0 }, select: { id: true } });
      if (d.trackStock) {
        await tx.product.update({ where: { id: novo.id }, data: { trackStock: true } });
        await moverEstoque(tx, novo.id, "initial", r3(d.stockQty ?? 0), { notes: "saldo quando o produto foi cadastrado", quem: s.name });
      }
      return novo;
    });
    revalidatePath("/produtos");
    revalidatePath("/pdv");
    return { ok: true, id: p.id };
  }

  const atual = await prisma.product.findUnique({ where: { id: d.id }, select: { trackStock: true, stockQty: true } });
  if (!atual) return { ok: false, erro: "Produto nao encontrado." };
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: d.id! }, data: base });
    if (d.trackStock && !atual.trackStock) {
      await tx.product.update({ where: { id: d.id! }, data: { trackStock: true, stockQty: 0 } });
      await moverEstoque(tx, d.id!, "initial", r3(d.stockQty ?? 0), { notes: "saldo quando o controle de estoque comecou", quem: s.name });
    } else if (!d.trackStock && atual.trackStock) {
      await tx.product.update({ where: { id: d.id! }, data: { trackStock: false } });
    }
  });
  revalidatePath("/produtos");
  revalidatePath("/pdv");
  return { ok: true, id: d.id };
}

/** Entrada de mercadoria: soma ao estoque e, se vier custo, ele vira o custo do produto. */
export async function entradaEstoque(productId: string, qtd: number, custoUnit: number | null, nota: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await equipe();
  if (!s) return { ok: false, erro: "Sem permissao." };
  if (!(qtd > 0) || qtd > 999999) return { ok: false, erro: "Quantidade da entrada invalida." };
  if (custoUnit != null && !(custoUnit >= 0)) return { ok: false, erro: "Custo invalido." };
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { trackStock: true } });
  if (!p) return { ok: false, erro: "Produto nao encontrado." };
  if (!p.trackStock) return { ok: false, erro: "Este produto nao controla estoque." };
  await prisma.$transaction((tx) => moverEstoque(tx, productId, "entry", qtd, { unitCost: custoUnit, notes: nota, quem: s.name }));
  revalidatePath("/produtos");
  return { ok: true };
}

/** Ajuste de contagem (so administrador/gerente): diz quanto tem na prateleira; o historico guarda a diferenca e o motivo. */
export async function ajustarEstoque(productId: string, contado: number, motivo: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await gestor();
  if (!s) return { ok: false, erro: "So gerente ou administrador ajusta o estoque." };
  if (!(contado >= 0) || contado > 999999) return { ok: false, erro: "Contagem invalida." };
  if (motivo.trim().length < 3) return { ok: false, erro: "O ajuste precisa de motivo." };
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { trackStock: true, stockQty: true } });
  if (!p) return { ok: false, erro: "Produto nao encontrado." };
  if (!p.trackStock) return { ok: false, erro: "Este produto nao controla estoque." };
  if (r3(contado) === r3(p.stockQty)) return { ok: false, erro: "A contagem e igual ao estoque." };
  await prisma.$transaction((tx) => moverEstoque(tx, productId, "adjust", r3(contado - p.stockQty), { notes: motivo, quem: s.name }));
  revalidatePath("/produtos");
  return { ok: true };
}

export interface MovimentoLinha {
  id: string;
  kind: string;
  delta: number;
  depois: number;
  quando: string;
  quem: string | null;
  nota: string | null;
  custo: number | null;
}

export async function historicoEstoque(productId: string): Promise<MovimentoLinha[]> {
  if (!(await equipe())) return [];
  const ms = await prisma.productStockMove.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take: 100 });
  return ms.map((m) => ({
    id: m.id,
    kind: m.kind,
    delta: m.qtyDelta,
    depois: m.qtyAfter,
    quando: m.createdAt.toISOString(),
    quem: m.createdBy,
    nota: m.notes,
    custo: m.unitCost,
  }));
}
