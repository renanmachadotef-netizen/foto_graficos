"use server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function approveQuote(quoteId: string) {
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "APPROVED" },
    include: { client: true }
  });
  
  // Create Service Order automatically
  const existingOs = await prisma.serviceOrder.findUnique({ where: { quoteId } });
  if (!existingOs) {
    await prisma.serviceOrder.create({
      data: { quoteId, status: "WAITING" }
    });
  }

  // Create Accounts Receivable (FinancialTransaction) automatically if not already created
  const existingTransaction = await prisma.financialTransaction.findFirst({
    where: { quoteId }
  });
  if (!existingTransaction) {
    await prisma.financialTransaction.create({
      data: {
        quoteId,
        clientId: quote.clientId,
        type: "INCOME",
        status: "PENDING",
        description: `Venda Orç. #${quote.id.slice(-5).toUpperCase()} - ${quote.title}`,
        amount: quote.finalPrice,
        dueDate: new Date(),
        category: "Vendas",
        notes: `Gerado automaticamente da aprovação do orçamento.`
      }
    });
  }

  revalidatePath("/quotes");
  revalidatePath("/financial");
  revalidatePath("/pcp");
}

export async function rejectQuote(quoteId: string) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "REJECTED" }
  });

  await prisma.financialTransaction.updateMany({
    where: { quoteId, status: "PENDING" },
    data: { status: "CANCELLED" }
  });

  revalidatePath("/quotes");
  revalidatePath("/financial");
}
