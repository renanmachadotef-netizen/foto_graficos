"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createRecipeAction(data: {
  name: string;
  category: string;
  woodType: string;
  agingMonths: number;
  targetAbv: number;
  sugarBrix?: number;
  fermentationType?: string;
  fermentationHours?: number;
  distillationType?: string;
  heartCutPercent?: number;
  sensoryProfile?: string;
  instructions?: string;
}) {
  const currentTenant = await getCurrentTenant();

  const recipe = await prisma.recipe.create({
    data: {
      tenantId: currentTenant,
      name: data.name,
      category: data.category || "ENVELHECIDA",
      woodType: data.woodType,
      agingMonths: data.agingMonths || 12,
      targetAbv: data.targetAbv || 42,
      sugarBrix: data.sugarBrix || null,
      fermentationType: data.fermentationType || "LEVEDURA_SELVAGEM",
      fermentationHours: data.fermentationHours || 30,
      distillationType: data.distillationType || "ALAMBIQUE_COBRE",
      heartCutPercent: data.heartCutPercent || 80,
      sensoryProfile: data.sensoryProfile || null,
      instructions: data.instructions || null,
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/");
  return recipe;
}

export async function updateRecipeAction(id: string, data: any) {
  const recipe = await prisma.recipe.update({
    where: { id },
    data,
  });

  revalidatePath("/recipes");
  revalidatePath("/");
  return recipe;
}

export async function deleteRecipeAction(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  revalidatePath("/");
  return { success: true };
}
