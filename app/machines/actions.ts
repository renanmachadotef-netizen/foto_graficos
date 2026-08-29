"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createMachine(data: any) {
  await prisma.machine.create({ data });
  revalidatePath("/machines");
}

export async function deleteMachine(id: string) {
  await prisma.machine.delete({ where: { id } });
  revalidatePath("/machines");
}

export async function updateMachine(id: string, data: any) {
  await prisma.machine.update({ where: { id }, data });
  revalidatePath("/machines");
}
