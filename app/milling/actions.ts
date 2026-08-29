"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createPlantationFieldAction(data: {
  name: string;
  variety: string;
  areaHectares: number;
  plantingDate?: string;
  estimatedTons: number;
}) {
  const currentTenant = await getCurrentTenant();
  const field = await prisma.plantationField.create({
    data: {
      tenantId: currentTenant,
      name: data.name,
      variety: data.variety,
      areaHectares: data.areaHectares,
      plantingDate: data.plantingDate ? new Date(data.plantingDate) : null,
      estimatedTons: data.estimatedTons,
    },
  });
  revalidatePath("/milling");
  revalidatePath("/");
  return field;
}

export async function recordAgriculturalCostAction(data: {
  fieldId?: string;
  category: string;
  description: string;
  amount: number;
  date?: string;
}) {
  const currentTenant = await getCurrentTenant();
  const cost = await prisma.agriculturalCost.create({
    data: {
      tenantId: currentTenant,
      fieldId: data.fieldId && data.fieldId !== "none" ? data.fieldId : null,
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });
  revalidatePath("/milling");
  revalidatePath("/financial");
  return cost;
}

export async function recordMillingRunAction(data: {
  fieldId?: string;
  batchNumber: string;
  caneTons: number;
  millingHours: number;
  juiceLiters: number;
  sugarBrix: number;
  operationalCost: number;
  notes?: string;
}) {
  const currentTenant = await getCurrentTenant();
  const yieldLitersPerTon = data.caneTons > 0 ? data.juiceLiters / data.caneTons : 0;
  const costPerLiterJuice = data.juiceLiters > 0 ? data.operationalCost / data.juiceLiters : 0;

  const milling = await prisma.millingRun.create({
    data: {
      tenantId: currentTenant,
      fieldId: data.fieldId && data.fieldId !== "none" ? data.fieldId : null,
      batchNumber: data.batchNumber,
      caneTons: data.caneTons,
      millingHours: data.millingHours,
      juiceLiters: data.juiceLiters,
      sugarBrix: data.sugarBrix,
      yieldLitersPerTon,
      operationalCost: data.operationalCost,
      costPerLiterJuice,
      notes: data.notes || null,
    },
  });

  revalidatePath("/milling");
  revalidatePath("/distillation");
  revalidatePath("/");
  return milling;
}
