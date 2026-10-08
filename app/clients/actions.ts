"use server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
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
  const currentTenant = await getCurrentTenant();

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
      tenantId: currentTenant,
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

export async function deleteClient(id: string) {
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  revalidatePath("/birthdays");
}

export async function updateClient(id: string, data: any) {
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
