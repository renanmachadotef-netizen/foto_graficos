"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dueDate: string | Date;
  status?: "PENDING" | "PAID";
  paymentDate?: string | Date | null;
  category?: string;
  paymentMethod?: string;
  clientId?: string | null;
  notes?: string;
}

export async function createFinancialTransaction(data: CreateTransactionInput) {
  const dueDateObj = new Date(data.dueDate);
  const paymentDateObj = data.status === "PAID" 
    ? (data.paymentDate ? new Date(data.paymentDate) : new Date())
    : null;

  await prisma.financialTransaction.create({
    data: {
      description: data.description,
      amount: Math.abs(data.amount),
      type: data.type,
      dueDate: dueDateObj,
      status: data.status || "PENDING",
      paymentDate: paymentDateObj,
      category: data.category || null,
      paymentMethod: data.paymentMethod || null,
      clientId: data.clientId && data.clientId !== "none" ? data.clientId : null,
      notes: data.notes || null,
      date: new Date(),
    },
  });

  revalidatePath("/financial");
}

export async function updateFinancialTransaction(
  id: string,
  data: Partial<CreateTransactionInput>
) {
  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = Math.abs(data.amount);
  if (data.type !== undefined) updateData.type = data.type;
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
  if (data.category !== undefined) updateData.category = data.category || null;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod || null;
  if (data.clientId !== undefined) updateData.clientId = data.clientId && data.clientId !== "none" ? data.clientId : null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "PAID") {
      updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    } else {
      updateData.paymentDate = null;
    }
  }

  await prisma.financialTransaction.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/financial");
}

export async function settleFinancialTransaction(
  id: string,
  paymentDate: string | Date = new Date(),
  paymentMethod?: string
) {
  await prisma.financialTransaction.update({
    where: { id },
    data: {
      status: "PAID",
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod || undefined,
    },
  });

  revalidatePath("/financial");
}

export async function reopenFinancialTransaction(id: string) {
  await prisma.financialTransaction.update({
    where: { id },
    data: {
      status: "PENDING",
      paymentDate: null,
    },
  });

  revalidatePath("/financial");
}

export async function deleteTransaction(id: string) {
  await prisma.financialTransaction.delete({ where: { id } });
  revalidatePath("/financial");
}

export async function uploadTransactions(
  transactions: { date: Date; description: string; amount: number; type: string; category?: string }[]
) {
  await prisma.financialTransaction.createMany({
    data: transactions.map((t) => ({
      date: t.date,
      dueDate: t.date,
      paymentDate: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.type,
      status: "PAID",
      category: t.category || "Extrato Bancário",
    })),
  });

  revalidatePath("/financial");
}

export async function updateCompanySettings(data: any) {
  const existing = await prisma.companySettings.findFirst();
  if (existing) {
    await prisma.companySettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.companySettings.create({ data });
  }
  revalidatePath("/settings");
  revalidatePath("/financial");
  revalidatePath("/");
  return { success: true };
}

export async function addFixedCost(name: string, amount: number) {
  await prisma.fixedCost.create({ data: { name, amount: Math.abs(amount) } });
  revalidatePath("/financial");
}

export async function deleteFixedCost(id: string) {
  await prisma.fixedCost.delete({ where: { id } });
  revalidatePath("/financial");
}
