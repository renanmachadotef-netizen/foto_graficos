"use server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createMachine(data: any) {
  await prisma.machine.create({ data });
  revalidatePath("/machines");
}

export async function deleteMachine(id: string) {
  await prisma.machine.delete({ where: { id } });
  revalidatePath("/machines");
}
