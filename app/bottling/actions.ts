"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface ExecuteBottlingInput {
  liquidSourceType?: "BARREL" | "BLEND" | "LIQUOR";
  sourceId?: string;
  barrelId?: string;
  productName: string;
  woodType: string;
  bottlesQuantity: number;
  bottleVolumeMl: number; // 750, 500, 160
  liquidCostPerLiter: number;
  bottleUnitCost: number;
  corkUnitCost: number;
  labelUnitCost: number;
  sealUnitCost: number;
  boxUnitCost: number;
  laborUnitCost: number;
  retailPrice: number;
  wholesalePrice: number;
  notes?: string;
}

export async function executeBottlingRunAction(data: ExecuteBottlingInput) {
  const currentTenant = await getCurrentTenant();

  const totalLitersNeeded = (data.bottlesQuantity * data.bottleVolumeMl) / 1000;
  const boxesNeeded = Math.ceil(data.bottlesQuantity / 6);
  const targetSourceId = data.sourceId || data.barrelId;
  const sourceType = data.liquidSourceType || "BARREL";

  // 1. If source is barrel, deduct liquid volume from barrel
  if (sourceType === "BARREL" && targetSourceId && targetSourceId !== "none") {
    const barrel = await prisma.barrel.findUnique({ where: { id: targetSourceId } });
    if (barrel) {
      const newLiters = Math.max(0, barrel.currentLiters - totalLitersNeeded);
      await prisma.barrel.update({
        where: { id: barrel.id },
        data: {
          currentLiters: newLiters,
          status: newLiters === 0 ? "EMPTY" : barrel.status,
        },
      });

      // Grava no Kardex a saída
      await prisma.barrelMovement.create({
        data: {
          tenantId: currentTenant,
          barrelId: barrel.id,
          type: "OUTPUT",
          liters: totalLitersNeeded,
          resultingLiters: newLiters,
          costPerLiterAfter: barrel.costPerLiter,
          batchNumber: barrel.batchNumber,
          abvPercentage: barrel.abvPercentage,
          responsibleName: "Mestre Alambiqueiro",
          notes: `Saída para Envase de ${data.bottlesQuantity} garrafas (${data.productName})`,
        },
      });
    }
  }

  // 2. Calculate Total COGS per bottle
  const liquidCostPerBottle = (data.bottleVolumeMl / 1000) * data.liquidCostPerLiter;
  const packagingCostPerBottle =
    data.bottleUnitCost +
    data.corkUnitCost +
    data.labelUnitCost +
    data.sealUnitCost +
    data.boxUnitCost / 6;
  const totalCogsPerBottle = liquidCostPerBottle + packagingCostPerBottle + data.laborUnitCost;

  // 3. Record Bottling Run
  const bottlingRun = await prisma.bottlingRun.create({
    data: {
      tenantId: currentTenant,
      liquidSourceType: sourceType,
      sourceId: targetSourceId && targetSourceId !== "none" ? targetSourceId : null,
      productName: data.productName,
      bottlesQuantity: data.bottlesQuantity,
      bottleVolumeMl: data.bottleVolumeMl,
      litersUsed: totalLitersNeeded,
      liquidCostPerLiter: data.liquidCostPerLiter,
      packagingCostPerBottle,
      laborCostPerBottle: data.laborUnitCost,
      cogsPerBottle: totalCogsPerBottle,
      retailPrice: data.retailPrice,
      wholesalePrice: data.wholesalePrice,
      notes: data.notes || `Envase de ${data.bottlesQuantity} garrafas (${data.woodType})`,
    },
  });

  // 4. Update or Create Finished Product in POS catalog
  const existingProduct = await prisma.product.findFirst({
    where: {
      tenantId: currentTenant,
      name: data.productName,
    },
  });

  if (existingProduct) {
    await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        price: data.retailPrice,
        cost: totalCogsPerBottle,
        description: `Cachaça ${data.woodType} • Envase de ${data.bottleVolumeMl}ml`,
        active: true,
      },
    });
  } else {
    await prisma.product.create({
      data: {
        tenantId: currentTenant,
        name: data.productName,
        category: "BEBIDAS",
        price: data.retailPrice,
        cost: totalCogsPerBottle,
        unit: "garrafa",
        description: `Cachaça ${data.woodType} • Envase de ${data.bottleVolumeMl}ml`,
        active: true,
      },
    });
  }

  revalidatePath("/bottling");
  revalidatePath("/barrels");
  revalidatePath("/pdv");
  revalidatePath("/materials");
  revalidatePath("/");

  return {
    success: true,
    bottlingRunId: bottlingRun.id,
    cogsPerBottle: totalCogsPerBottle,
    totalBottles: data.bottlesQuantity,
    totalLitersUsed: totalLitersNeeded,
  };
}
