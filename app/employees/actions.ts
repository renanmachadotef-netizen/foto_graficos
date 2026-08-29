"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEmployee(data: any) {
  await prisma.employee.create({ data });
  revalidatePath("/employees");
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/employees");
}

export async function updateEmployee(id: string, data: any) {
  await prisma.employee.update({ where: { id }, data });
  revalidatePath("/employees");
}
