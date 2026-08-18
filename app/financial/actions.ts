"use server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function uploadTransactions(transactions: { date: Date, description: string, amount: number, type: string }[]) {
  // Bulk create
  await prisma.financialTransaction.createMany({
    data: transactions
  });
  revalidatePath("/financial");
}

export async function deleteTransaction(id: string) {
  await prisma.financialTransaction.delete({ where: { id } });
  revalidatePath("/financial");
}

export async function updateCompanySettings(data: any) {
  const existing = await prisma.companySettings.findFirst();
  if (existing) {
    await prisma.companySettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.companySettings.create({ data });
  }
  revalidatePath("/financial");
}
