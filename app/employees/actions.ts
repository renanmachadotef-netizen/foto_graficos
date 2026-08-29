"use server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createEmployee(data: any) {
  const currentTenant = await getCurrentTenant();
  await prisma.employee.create({
    data: {
      ...data,
      tenantId: currentTenant,
    },
  });
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
