"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Regras da loja trazidas do nexcopy: desconto maximo da equipe e papel do recibo. So administrador. */
export async function salvarRegrasLoja(d: { staffDiscountMax: number; receiptPaper: string }): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return { ok: false, erro: "So o administrador muda as regras da loja." };
  const max = Number(d.staffDiscountMax);
  if (!Number.isFinite(max) || max < 0 || max > 100) return { ok: false, erro: "O desconto maximo vai de 0 a 100%." };
  const papel = d.receiptPaper === "58" ? "58" : "80";
  const existe = await prisma.companySettings.findFirst({ select: { id: true } });
  if (existe) await prisma.companySettings.update({ where: { id: existe.id }, data: { staffDiscountMax: max, receiptPaper: papel } });
  else await prisma.companySettings.create({ data: { staffDiscountMax: max, receiptPaper: papel } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Limite do fiado de um cliente (vazio = sem limite). So administrador. */
export async function definirLimiteFiado(clientId: string, limite: number | null): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return { ok: false, erro: "So o administrador muda o limite do fiado." };
  if (limite != null && !(limite >= 0)) return { ok: false, erro: "Limite invalido." };
  await prisma.client.update({ where: { id: clientId }, data: { creditLimit: limite == null ? null : Math.round(limite * 100) / 100 } });
  revalidatePath("/clients");
  revalidatePath("/receber");
  return { ok: true };
}
