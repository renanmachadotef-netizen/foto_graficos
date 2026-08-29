"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getBarrelsAction() {
  const currentTenant = await getCurrentTenant();
  return prisma.barrel.findMany({
    where: { tenantId: currentTenant },
    include: {
      movements: {
        orderBy: { date: "desc" },
      },
    },
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

  const barrel = await prisma.barrel.create({
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

  // Record initial movement if has liters
  if (data.currentLiters > 0) {
    await prisma.barrelMovement.create({
      data: {
        tenantId: currentTenant,
        barrelId: barrel.id,
        type: "INPUT",
        liters: data.currentLiters,
        resultingLiters: data.currentLiters,
        date: new Date(data.fillDate),
        batchNumber: data.batchNumber,
        abvPercentage: data.abvPercentage,
        responsibleName: "Mestre Alambiqueiro",
        notes: "Abastecimento inicial do barril",
      },
    });
  }

  revalidatePath("/barrels");
  revalidatePath("/recipes");
  revalidatePath("/");
  return { success: true };
}

export async function recordBarrelMovementAction(data: {
  barrelId: string;
  type: "INPUT" | "OUTPUT" | "TRANSFER" | "LOSS";
  liters: number;
  date: string;
  batchNumber?: string;
  abvPercentage?: number;
  responsibleName?: string;
  notes?: string;
}) {
  const currentTenant = await getCurrentTenant();

  const barrel = await prisma.barrel.findUnique({
    where: { id: data.barrelId },
  });

  if (!barrel) throw new Error("Barril não encontrado");

  let resultingLiters = barrel.currentLiters;

  if (data.type === "INPUT") {
    resultingLiters = Math.min(barrel.capacityLiters, barrel.currentLiters + data.liters);
  } else {
    // OUTPUT, TRANSFER, LOSS
    resultingLiters = Math.max(0, barrel.currentLiters - data.liters);
  }

  // 1. Update Barrel
  await prisma.barrel.update({
    where: { id: barrel.id },
    data: {
      currentLiters: resultingLiters,
      status: resultingLiters === 0 ? "EMPTY" : barrel.status,
      abvPercentage: data.abvPercentage || barrel.abvPercentage,
    },
  });

  // 2. Record Movement
  const movement = await prisma.barrelMovement.create({
    data: {
      tenantId: currentTenant,
      barrelId: barrel.id,
      type: data.type,
      liters: data.liters,
      resultingLiters,
      date: new Date(data.date),
      batchNumber: data.batchNumber || barrel.batchNumber,
      abvPercentage: data.abvPercentage || barrel.abvPercentage,
      responsibleName: data.responsibleName || "Mestre Alambiqueiro",
      notes: data.notes || null,
    },
  });

  revalidatePath("/barrels");
  revalidatePath("/bottling");
  revalidatePath("/");

  return { success: true, movement, resultingLiters };
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
