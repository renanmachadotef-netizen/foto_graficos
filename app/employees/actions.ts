"use server";
import { exigirPapel, exigirPapelAcao } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEmployee(data: any) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.employee.create({
    data: {
      ...data,
    },
  });
  revalidatePath("/employees");
}

export async function deleteEmployee(id: string) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/employees");
}

export async function updateEmployee(id: string, data: any) {
  await exigirPapelAcao(["ADMIN"]);
  await prisma.employee.update({ where: { id }, data });
  revalidatePath("/employees");
}
