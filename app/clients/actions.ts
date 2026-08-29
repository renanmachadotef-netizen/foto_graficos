"use server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createClient(data: any) {
  const currentTenant = await getCurrentTenant();
  await prisma.client.create({
    data: {
      ...data,
      tenantId: currentTenant,
    },
  });
  revalidatePath("/clients");
}

export async function deleteClient(id: string) {
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
}

export async function updateClient(id: string, data: any) {
  await prisma.client.update({ where: { id }, data });
  revalidatePath("/clients");
}
