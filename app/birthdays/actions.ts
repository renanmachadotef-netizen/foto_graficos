"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant, TENANT_CONFIGS } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getBirthdaysByMonth(month: number) {
  const currentTenant = await getCurrentTenant();

  const clients = await prisma.client.findMany({
    where: {
      tenantId: currentTenant,
      birthMonth: month,
    },
    orderBy: {
      birthDay: "asc",
    },
  });

  return clients;
}

export async function drawBirthdayWinnerAction(month: number, prizeDescription: string) {
  const currentTenant = await getCurrentTenant();
  const company = await prisma.companySettings.findFirst({ where: { tenantId: currentTenant } });
  const tenantConfig = TENANT_CONFIGS[currentTenant];

  const clients = await prisma.client.findMany({
    where: {
      tenantId: currentTenant,
      birthMonth: month,
    },
  });

  if (clients.length === 0) {
    return { error: "Não há aniversariantes cadastrados neste mês para realizar o sorteio." };
  }

  // Random pick
  const winnerIndex = Math.floor(Math.random() * clients.length);
  const winner = clients[winnerIndex];

  const companyName = company?.companyName || tenantConfig.name;
  const prize = prizeDescription || (currentTenant === "PURABRASIL" ? "1 Garrafa de Cachaça Especial" : "1 Banner Personalizado 1x1m");

  const whatsappMessage = `🎉 *PARABÉNS, ${winner.name.toUpperCase()}!* 🎂🎈\n\n` +
    `Em comemoração ao seu mês de aniversário, você foi o(a) grande sorteado(a) no *Sorteio Especial de Aniversariantes* da *${companyName}*!\n\n` +
    `🎁 *Seu Prêmio:* ${prize}\n\n` +
    `Apresente esta mensagem para retirar seu presente ou entre em contato para combinarmos a entrega.\n\n` +
    `Desejamos a você muita saúde, paz e realizações! 🥳✨`;

  const cleanPhone = (winner.phone || "").replace(/\D/g, "");
  const whatsappUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return {
    success: true,
    winner,
    prize,
    whatsappUrl,
    whatsappMessage,
    totalParticipants: clients.length,
  };
}

export async function saveClientBirthdayAction(clientId: string, birthDateStr: string) {
  if (!birthDateStr) return { error: "Data inválida" };

  const parts = birthDateStr.split("-"); // YYYY-MM-DD
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month - 1, day);

    await prisma.client.update({
      where: { id: clientId },
      data: {
        birthDate: date,
        birthDay: day,
        birthMonth: month,
      },
    });

    revalidatePath("/birthdays");
    revalidatePath("/clients");
    return { success: true };
  }

  return { error: "Formato de data incorreto" };
}
