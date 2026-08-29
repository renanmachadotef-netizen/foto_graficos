"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: any) {
  await prisma.client.create({ data });
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
