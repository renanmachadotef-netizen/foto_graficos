"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface BlendItemInput {
  barrelId: string;
  litersUsed: number;
}

export async function createBlendBatchAction(data: {
  name: string;
  batchNumber: string;
  date?: string;
  items: BlendItemInput[];
  destinationBarrelId?: string;
  notes?: string;
}) {
  const currentTenant = await getCurrentTenant();

  // 1. Fetch all source barrels and validate available volume
  const barrelIds = data.items.map((i) => i.barrelId);
  const barrels = await prisma.barrel.findMany({
    where: { id: { in: barrelIds } },
  });

  let totalLiters = 0;
  let totalWeightedValue = 0;
  let totalWeightedAbv = 0;

  const resolvedItems: { barrelId: string; litersUsed: number; costPerLiter: number; woodType: string }[] = [];

  for (const item of data.items) {
    const b = barrels.find((x) => x.id === item.barrelId);
    if (!b) throw new Error(`Barril ${item.barrelId} não encontrado`);
    if (b.currentLiters < item.litersUsed) {
      throw new Error(`Saldo insuficiente no barril ${b.code} (Disponível: ${b.currentLiters}L, Solicitado: ${item.litersUsed}L)`);
    }

    totalLiters += item.litersUsed;
    totalWeightedValue += item.litersUsed * b.costPerLiter;
    totalWeightedAbv += item.litersUsed * b.abvPercentage;

    resolvedItems.push({
      barrelId: b.id,
      litersUsed: item.litersUsed,
      costPerLiter: b.costPerLiter,
      woodType: b.woodType,
    });

    // Abate do barril de origem e grava no Kardex
    const resultingLiters = b.currentLiters - item.litersUsed;
    await prisma.barrel.update({
      where: { id: b.id },
      data: {
        currentLiters: resultingLiters,
        status: resultingLiters === 0 ? "EMPTY" : b.status,
      },
    });

    await prisma.barrelMovement.create({
      data: {
        tenantId: currentTenant,
        barrelId: b.id,
        type: "TRANSFER",
        liters: item.litersUsed,
        resultingLiters,
        costPerLiterAfter: b.costPerLiter,
        date: data.date ? new Date(data.date) : new Date(),
        responsibleName: "Mestre Alambiqueiro",
        notes: `Transferência para Lote de Blend: ${data.name} (${data.batchNumber})`,
      },
    });
  }

  const averageCostPerLiter = totalLiters > 0 ? totalWeightedValue / totalLiters : 0;
  const finalAbv = totalLiters > 0 ? totalWeightedAbv / totalLiters : 42.0;

  // 2. Grava o Lote de Blend
  const blendBatch = await prisma.blendBatch.create({
    data: {
      tenantId: currentTenant,
      name: data.name,
      batchNumber: data.batchNumber,
      date: data.date ? new Date(data.date) : new Date(),
      totalLiters,
      averageCostPerLiter,
      finalAbv,
      destinationBarrelId: data.destinationBarrelId && data.destinationBarrelId !== "none" ? data.destinationBarrelId : null,
      notes: data.notes || null,
      items: {
        create: resolvedItems.map((ri) => ({
          barrelId: ri.barrelId,
          litersUsed: ri.litersUsed,
          costPerLiter: ri.costPerLiter,
          woodType: ri.woodType,
        })),
      },
    },
  });

  // 3. Se houver barril de destino, abastece o tonel de repouso com o blend
  if (data.destinationBarrelId && data.destinationBarrelId !== "none") {
    const destBarrel = await prisma.barrel.findUnique({ where: { id: data.destinationBarrelId } });
    if (destBarrel) {
      const newLiters = Math.min(destBarrel.capacityLiters, destBarrel.currentLiters + totalLiters);
      await prisma.barrel.update({
        where: { id: destBarrel.id },
        data: {
          currentLiters: newLiters,
          costPerLiter: averageCostPerLiter,
          abvPercentage: finalAbv,
          status: "AGING",
        },
      });

      await prisma.barrelMovement.create({
        data: {
          tenantId: currentTenant,
          barrelId: destBarrel.id,
          type: "INPUT",
          liters: totalLiters,
          resultingLiters: newLiters,
          costPerLiterAfter: averageCostPerLiter,
          date: data.date ? new Date(data.date) : new Date(),
          batchNumber: data.batchNumber,
          abvPercentage: finalAbv,
          responsibleName: "Mestre Alambiqueiro",
          notes: `Abastecimento do Lote de Blend: ${data.name}`,
        },
      });
    }
  }

  revalidatePath("/blends");
  revalidatePath("/barrels");
  revalidatePath("/bottling");
  revalidatePath("/");

  return blendBatch;
}

export async function createLiquorBatchAction(data: {
  name: string;
  flavor: string;
  batchNumber: string;
  baseSpiritLiters: number;
  baseSpiritCostPerLiter: number;
  ingredientsCost: number;
  macerationDays: number;
  finalVolumeLiters: number;
  finalAbv: number;
  notes?: string;
}) {
  const currentTenant = await getCurrentTenant();

  const totalBaseSpiritValue = data.baseSpiritLiters * data.baseSpiritCostPerLiter;
  const totalCost = totalBaseSpiritValue + data.ingredientsCost;
  const costPerLiter = data.finalVolumeLiters > 0 ? totalCost / data.finalVolumeLiters : 0;

  const liquor = await prisma.liquorBatch.create({
    data: {
      tenantId: currentTenant,
      name: data.name,
      flavor: data.flavor,
      batchNumber: data.batchNumber,
      baseSpiritLiters: data.baseSpiritLiters,
      baseSpiritCostPerLiter: data.baseSpiritCostPerLiter,
      ingredientsCost: data.ingredientsCost,
      macerationDays: data.macerationDays,
      finalVolumeLiters: data.finalVolumeLiters,
      finalAbv: data.finalAbv,
      costPerLiter,
      notes: data.notes || null,
    },
  });

  revalidatePath("/blends");
  revalidatePath("/bottling");
  revalidatePath("/");

  return liquor;
}
