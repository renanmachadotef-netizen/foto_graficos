"use server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function saveQuote(data: any) {
  const currentTenant = await getCurrentTenant();

  const quote = await prisma.quote.create({
    data: {
      tenantId: currentTenant,
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
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/quotes");
  return quote.id;
}
