"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PosCartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  unit?: string;
  notes?: string;
}

export interface PosSaleInput {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  items: PosCartItem[];
  discount: number; // in R$
  paymentMethod: "PIX" | "CARD_CREDIT" | "CARD_DEBIT" | "CASH" | "TRANSFER" | "OTHER";
  amountPaid: number;
  isPartialPayment?: boolean;
  sendToPcp?: boolean;
  notes?: string;
}

// Seed default quick products if none exist
export async function ensureDefaultProducts() {
  const count = await prisma.product.count();
  if (count === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: "Cartão de Visita 1000un (4x0)",
          category: "BALCAO",
          price: 75.0,
          cost: 35.0,
          unit: "milheiro",
          description: "Couchê 250g c/ Verniz Total Frente",
        },
        {
          name: "Banner Lona 440g c/ Bastão e Corda",
          category: "IMPRESSAO",
          price: 65.0,
          cost: 22.0,
          unit: "m2",
          description: "Impressão digital de alta resolução com acabamento",
        },
        {
          name: "Adesivo Vinil Brilho Recortado",
          category: "IMPRESSAO",
          price: 55.0,
          cost: 18.0,
          unit: "m2",
          description: "Vinil adesivo automotivo/comercial",
        },
        {
          name: "Foto 3x4 (Cartela c/ 8 fotos)",
          category: "FOTOS",
          price: 20.0,
          cost: 3.0,
          unit: "un",
          description: "Papel fotográfico glossy profissional",
        },
        {
          name: "Impressão A4 Colorida (Laser)",
          category: "BALCAO",
          price: 2.5,
          cost: 0.4,
          unit: "un",
          description: "Papel sulfite 75g",
        },
        {
          name: "Plastificação A4 Polaseal",
          category: "ACABAMENTO",
          price: 6.0,
          cost: 1.2,
          unit: "un",
          description: "Polaseal térmico cristalino 0.05",
        },
        {
          name: "Crachá PVC c/ Cordão e Jacaré",
          category: "BRINDES",
          price: 18.0,
          cost: 5.5,
          unit: "un",
          description: "PVC 0.76mm alta durabilidade",
        },
        {
          name: "Faixa em Lona c/ Ilhoses",
          category: "IMPRESSAO",
          price: 45.0,
          cost: 16.0,
          unit: "m2",
          description: "Lona 440g com reforço e ilhoses nas pontas",
        },
      ],
    });
  }
}

export async function createPosSaleAction(data: PosSaleInput) {
  const session = await getSession();

  if (!data.items || data.items.length === 0) {
    return { error: "O carrinho está vazio." };
  }

  // 1. Resolve Client (Default to "Cliente Balcão" if not selected)
  let clientId = data.clientId;
  let clientName = data.clientName || "Cliente Balcão";
  let clientPhone = data.clientPhone || "";

  if (!clientId || clientId === "balcao") {
    let balcaoClient = await prisma.client.findFirst({
      where: { name: "Cliente Balcão" },
    });

    if (!balcaoClient) {
      balcaoClient = await prisma.client.create({
        data: {
          name: "Cliente Balcão",
          phone: clientPhone || null,
          email: "balcao@fotograficos.com.br",
        },
      });
    }
    clientId = balcaoClient.id;
    clientName = balcaoClient.name;
    clientPhone = balcaoClient.phone || "";
  } else {
    const existingClient = await prisma.client.findUnique({ where: { id: clientId } });
    if (existingClient) {
      clientName = existingClient.name;
      clientPhone = existingClient.phone || "";
    }
  }

  // 2. Calculations
  const subtotal = data.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalCost = data.items.reduce((acc, it) => acc + (it.unitCost || it.unitPrice * 0.4) * it.quantity, 0);
  const finalPrice = Math.max(0, subtotal - (data.discount || 0));
  const markup = totalCost > 0 ? (finalPrice / totalCost) : 1.5;
  const netProfit = finalPrice - totalCost;

  const now = new Date();
  const title = `PDV Balcão - ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  // 3. Create Quote and Items
  const quote = await prisma.quote.create({
    data: {
      clientId,
      sellerId: session?.id || null,
      title,
      status: "APPROVED",
      isPosSale: true,
      totalCost,
      markup,
      finalPrice,
      netProfit,
      items: {
        create: data.items.map((it) => ({
          description: it.name + (it.notes ? ` (${it.notes})` : ""),
          quantity: it.quantity,
          unitCost: it.unitCost || it.unitPrice * 0.4,
          unitPrice: it.unitPrice,
        })),
      },
    },
  });

  // 4. Create Service Order (PCP) if requested
  if (data.sendToPcp !== false) {
    await prisma.serviceOrder.create({
      data: {
        quoteId: quote.id,
        status: "WAITING",
        priority: "NORMAL",
        deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
      },
    });
  }

  // 5. Financial Transactions
  const amountPaid = Number(data.amountPaid) || finalPrice;
  const change = Math.max(0, amountPaid - finalPrice);
  const actualPaidAmount = Math.min(amountPaid, finalPrice);

  if (actualPaidAmount > 0) {
    await prisma.financialTransaction.create({
      data: {
        quoteId: quote.id,
        clientId,
        description: `Venda PDV Balcão #${quote.id.slice(-5)}`,
        amount: actualPaidAmount,
        type: "INCOME",
        status: "PAID",
        paymentDate: now,
        dueDate: now,
        paymentMethod: data.paymentMethod,
        category: "Vendas Balcão PDV",
      },
    });
  }

  // If partial payment (restante a receber na retirada)
  const remaining = finalPrice - actualPaidAmount;
  if (remaining > 0) {
    await prisma.financialTransaction.create({
      data: {
        quoteId: quote.id,
        clientId,
        description: `Saldo Restante PDV #${quote.id.slice(-5)} (A Receber)`,
        amount: remaining,
        type: "INCOME",
        status: "PENDING",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        category: "Vendas Balcão PDV",
      },
    });
  }

  // Generate WhatsApp Message
  const company = await prisma.companySettings.findFirst();
  const companyName = company?.companyName || "Foto & Gráficos";

  let whatsappText = `Olá *${clientName}*, seu pedido na *${companyName}* foi confirmado com sucesso!\n\n`;
  whatsappText += `📋 *Pedido:* #${quote.id.slice(-5).toUpperCase()}\n`;
  whatsappText += `🛒 *Itens:*\n`;
  data.items.forEach((it) => {
    whatsappText += `• ${it.quantity}x ${it.name} - R$ ${(it.quantity * it.unitPrice).toFixed(2)}\n`;
  });
  if (data.discount > 0) {
    whatsappText += `🏷️ Desconto: R$ ${data.discount.toFixed(2)}\n`;
  }
  whatsappText += `\n💰 *Total:* R$ ${finalPrice.toFixed(2)}\n`;
  whatsappText += `💳 *Forma de Pagamento:* ${data.paymentMethod}\n`;
  if (remaining > 0) {
    whatsappText += `💵 *Valor Pago:* R$ ${actualPaidAmount.toFixed(2)}\n`;
    whatsappText += `⏳ *Saldo a Pagar na Retirada:* R$ ${remaining.toFixed(2)}\n`;
  } else {
    whatsappText += `✅ *Status do Pagamento:* Quitado / Pago\n`;
  }
  whatsappText += `\nObrigado pela preferência!`;

  const cleanPhone = clientPhone.replace(/\D/g, "");
  const whatsappUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(whatsappText)}`
    : null;

  revalidatePath("/pdv");
  revalidatePath("/financial");
  revalidatePath("/pcp");
  revalidatePath("/quotes");
  revalidatePath("/");

  return {
    success: true,
    quoteId: quote.id,
    saleNumber: quote.id.slice(-5).toUpperCase(),
    finalPrice,
    amountPaid: actualPaidAmount,
    change,
    remaining,
    clientName,
    paymentMethod: data.paymentMethod,
    items: data.items,
    whatsappUrl,
    whatsappText,
  };
}

export async function createProductAction(data: {
  name: string;
  category: string;
  price: number;
  cost?: number;
  unit?: string;
  description?: string;
}) {
  await prisma.product.create({
    data: {
      name: data.name,
      category: data.category || "BALCAO",
      price: data.price,
      cost: data.cost || 0,
      unit: data.unit || "un",
      description: data.description || null,
    },
  });

  revalidatePath("/pdv");
  return { success: true };
}

export async function deleteProductAction(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/pdv");
  return { success: true };
}
