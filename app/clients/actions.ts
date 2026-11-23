"use server";
import { exigirPapel, exigirPapelAcao } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { normalizarBusca } from "@/lib/busca";
import { revalidatePath } from "next/cache";

export async function createClient(data: {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  birthDate?: string;
}) {
  await exigirPapelAcao(["ADMIN", "MANAGER", "SELLER"]);

  let birthDateObj: Date | null = null;
  let birthDay: number | null = null;
  let birthMonth: number | null = null;

  if (data.birthDate) {
    const parts = data.birthDate.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        birthDateObj = new Date(y, m - 1, d);
        birthDay = d;
        birthMonth = m;
      }
    }
  }

  await prisma.client.create({
    data: {
      searchKey: normalizarBusca(data.name, data.phone, data.document),
      name: data.name,
      document: data.document || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      gender: data.gender || "M",
      birthDate: birthDateObj,
      birthDay,
      birthMonth,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/birthdays");
}

export async function deleteClient(id: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  await exigirPapelAcao(["ADMIN", "MANAGER", "SELLER"]);
  const c = await prisma.client.findUnique({
    where: { id },
    select: { _count: { select: { quotes: true } } },
  });
  if (!c) return { ok: false, erro: "Cliente não encontrado (talvez já tenha sido excluído)." };
  if (c._count.quotes > 0) return { ok: false, erro: "Esse cliente tem vendas ou orçamentos no histórico, por isso não pode ser excluído." };
  const aberto = await prisma.financialTransaction.count({ where: { clientId: id, status: "PENDING" } });
  if (aberto > 0) return { ok: false, erro: "Esse cliente tem conta em aberto (fiado ou a receber). Resolva antes de excluir." };
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  revalidatePath("/birthdays");
  return { ok: true };
}

export async function updateClient(id: string, data: any) {
  await exigirPapelAcao(["ADMIN", "MANAGER", "SELLER"]);
  let updateData: any = { ...data };
  if (data.birthDate && typeof data.birthDate === "string") {
    const parts = data.birthDate.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        updateData.birthDate = new Date(y, m - 1, d);
        updateData.birthDay = d;
        updateData.birthMonth = m;
      }
    }
  }

  await prisma.client.update({ where: { id }, data: updateData });
  revalidatePath("/clients");
  revalidatePath("/birthdays");
}
