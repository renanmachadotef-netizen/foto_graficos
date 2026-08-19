"use server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function saveQuote(data: any) {
  const quote = await prisma.quote.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      totalCost: data.totalCost,
      markup: data.markup,
      finalPrice: data.finalPrice,
      taxRate: data.taxRate || 0,
      cardFeeRate: data.cardFeeRate || 0,
      netProfit: data.netProfit || 0,
      items: {
        create: data.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitPrice: item.unitPrice
        }))
      }
    }
  });
  
  return quote.id;
}
