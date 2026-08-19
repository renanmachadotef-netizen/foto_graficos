"use server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createMaterial(data: any) {
  await prisma.material.create({ data });
  revalidatePath("/materials");
}

export async function deleteMaterial(id: string) {
  await prisma.material.delete({ where: { id } });
  revalidatePath("/materials");
}

export async function updateMaterial(id: string, data: any) {
  await prisma.material.update({ where: { id }, data });
  revalidatePath("/materials");
}
