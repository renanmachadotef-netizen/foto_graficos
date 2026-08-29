"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function recordDistillationRunAction(data: {
  fermentationId?: string;
  batchNumber: string;
  stillNumber: string;
  washVolumeInput: number;
  headsLiters: number;
  headsAbv?: number;
  heartsLiters: number;
  heartsAbv?: number;
  tailsLiters: number;
  tailsAbv?: number;
  totalRunCost: number;
  destinationBarrelId?: string;
  notes?: string;
}) {
  const currentTenant = await getCurrentTenant();

  const totalDistillate = data.headsLiters + data.heartsLiters + data.tailsLiters;
  const headsPercentage = totalDistillate > 0 ? (data.headsLiters / totalDistillate) * 100 : 0;
  const heartsPercentage = totalDistillate > 0 ? (data.heartsLiters / totalDistillate) * 100 : 0;
  const tailsPercentage = totalDistillate > 0 ? (data.tailsLiters / totalDistillate) * 100 : 0;

  // 1. O custo total da alambicada recai 100% sobre o volume do Coração
  const costPerLiterHeart = data.heartsLiters > 0 ? data.totalRunCost / data.heartsLiters : 0;

  // 2. Grava a Alambicada
  const distillation = await prisma.distillationRun.create({
    data: {
      tenantId: currentTenant,
      fermentationId: data.fermentationId && data.fermentationId !== "none" ? data.fermentationId : null,
      batchNumber: data.batchNumber,
      stillNumber: data.stillNumber,
      washVolumeInput: data.washVolumeInput,
      headsLiters: data.headsLiters,
      headsPercentage,
      headsAbv: data.headsAbv || 65.0,
      heartsLiters: data.heartsLiters,
      heartsPercentage,
      heartsAbv: data.heartsAbv || 44.0,
      tailsLiters: data.tailsLiters,
      tailsPercentage,
      tailsAbv: data.tailsAbv || 15.0,
      totalRunCost: data.totalRunCost,
      costPerLiterHeart,
      destinationBarrelId: data.destinationBarrelId && data.destinationBarrelId !== "none" ? data.destinationBarrelId : null,
      notes: data.notes || null,
    },
  });

  // 3. Se um barril de destino foi selecionado, abastece o barril com o volume e custo do Coração
  if (data.destinationBarrelId && data.destinationBarrelId !== "none") {
    const barrel = await prisma.barrel.findUnique({ where: { id: data.destinationBarrelId } });
    if (barrel) {
      const newLiters = Math.min(barrel.capacityLiters, barrel.currentLiters + data.heartsLiters);
      
      // Recalcula custo médio se o barril já tinha saldo anterior
      const previousTotalValue = barrel.currentLiters * barrel.costPerLiter;
      const newTotalValue = previousTotalValue + (data.heartsLiters * costPerLiterHeart);
      const newAvgCost = newLiters > 0 ? newTotalValue / newLiters : costPerLiterHeart;

      await prisma.barrel.update({
        where: { id: barrel.id },
        data: {
          currentLiters: newLiters,
          costPerLiter: newAvgCost,
          abvPercentage: data.heartsAbv || barrel.abvPercentage,
          status: "AGING",
        },
      });

      // Registra no Kardex
      await prisma.barrelMovement.create({
        data: {
          tenantId: currentTenant,
          barrelId: barrel.id,
          type: "INPUT",
          liters: data.heartsLiters,
          resultingLiters: newLiters,
          costPerLiterAfter: newAvgCost,
          batchNumber: data.batchNumber,
          abvPercentage: data.heartsAbv || barrel.abvPercentage,
          responsibleName: "Mestre Alambiqueiro",
          notes: `Entrada de Coração da Alambicada ${data.batchNumber} (${data.stillNumber})`,
        },
      });
    }
  }

  revalidatePath("/distillation");
  revalidatePath("/barrels");
  revalidatePath("/");
  return distillation;
}
