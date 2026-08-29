"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getBarrelsAction() {
  const currentTenant = await getCurrentTenant();
  return prisma.barrel.findMany({
    where: { tenantId: currentTenant },
    orderBy: { code: "asc" },
  });
}

export async function createBarrelAction(data: {
  code: string;
  woodType: string;
  capacityLiters: number;
  currentLiters: number;
  abvPercentage: number;
  fillDate: string;
  batchNumber: string;
  status?: string;
  sensoryNotes?: string;
  location?: string;
}) {
  const currentTenant = await getCurrentTenant();

  await prisma.barrel.create({
    data: {
      tenantId: currentTenant,
      code: data.code,
      woodType: data.woodType,
      capacityLiters: data.capacityLiters,
      currentLiters: data.currentLiters,
      abvPercentage: data.abvPercentage,
      fillDate: new Date(data.fillDate),
      batchNumber: data.batchNumber,
      status: data.status || "AGING",
      sensoryNotes: data.sensoryNotes || null,
      location: data.location || null,
    },
  });

  revalidatePath("/barrels");
  revalidatePath("/");
  return { success: true };
}

export async function updateBarrelAction(
  id: string,
  data: Partial<{
    currentLiters: number;
    abvPercentage: number;
    status: string;
    sensoryNotes: string;
    location: string;
  }>
) {
  await prisma.barrel.update({
    where: { id },
    data,
  });

  revalidatePath("/barrels");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBarrelAction(id: string) {
  await prisma.barrel.delete({ where: { id } });
  revalidatePath("/barrels");
  revalidatePath("/");
  return { success: true };
}
