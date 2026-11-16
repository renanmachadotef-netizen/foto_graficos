"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function definirEtiquetas(clientId: string, tags: string[]): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER", "SELLER"].includes(s.role)) return { ok: false, erro: "Sem permissao." };
  const limpas = [...new Set((tags || []).map((t) => String(t).trim().replace(/\s+/g, " ").slice(0, 20)).filter((t) => t.length >= 2))].slice(0, 8);
  const r = await prisma.client.updateMany({ where: { id: clientId }, data: { tags: limpas } });
  if (r.count === 0) return { ok: false, erro: "Cliente nao encontrado." };
  revalidatePath("/clients");
  return { ok: true };
}
