"use server";
import { exigirPapel, exigirPapelAcao } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createMachine(data: any) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.machine.create({
    data: {
      ...data,
    },
  });
  revalidatePath("/machines");
}

export async function deleteMachine(id: string) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.machine.delete({ where: { id } });
  revalidatePath("/machines");
}

export async function updateMachine(id: string, data: any) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.machine.update({ where: { id }, data });
  revalidatePath("/machines");
}
