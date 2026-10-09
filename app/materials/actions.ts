"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMaterial(data: {
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  width?: number | null;
  wasteMargin?: number;
}) {
  const session = await getSession();

  const material = await prisma.material.create({
    data: {
      name: data.name,
      category: data.category || "VINIL_LONA",
      unit: data.unit,
      unitCost: data.unitCost,
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      width: data.width || null,
      wasteMargin: data.wasteMargin || 0,
    },
  });

  if ((data.currentStock || 0) > 0) {
    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        type: "IN",
        quantity: data.currentStock || 0,
        unitCost: data.unitCost,
        notes: "Saldo inicial cadastrado",
        userId: session?.id,
      },
    });
  }

  revalidatePath("/materials");
  revalidatePath("/");
  return { success: true };
}

export async function updateMaterial(
  id: string,
  data: {
    name?: string;
    category?: string;
    unitCost?: number;
    minStock?: number;
    width?: number | null;
    wasteMargin?: number;
  }
) {
  await prisma.material.update({
    where: { id },
    data,
  });

  revalidatePath("/materials");
  revalidatePath("/");
  return { success: true };
}

export async function deleteMaterial(id: string) {
  await prisma.material.delete({ where: { id } });
  revalidatePath("/materials");
  revalidatePath("/");
  return { success: true };
}

export async function recordStockMovement(data: {
  materialId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unitCost?: number;
  notes?: string;
}) {
  const session = await getSession();
  const material = await prisma.material.findUnique({
    where: { id: data.materialId },
  });

  if (!material) throw new Error("Material não encontrado.");

  let newStock = material.currentStock;
  if (data.type === "IN") {
    newStock += data.quantity;
  } else if (data.type === "OUT") {
    newStock = Math.max(0, newStock - data.quantity);
  } else if (data.type === "ADJUSTMENT") {
    newStock = data.quantity;
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        materialId: data.materialId,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost || material.unitCost,
        notes: data.notes,
        userId: session?.id,
      },
    }),
    prisma.material.update({
      where: { id: data.materialId },
      data: {
        currentStock: newStock,
        unitCost: data.unitCost && data.type === "IN" ? data.unitCost : material.unitCost,
      },
    }),
  ]);

  revalidatePath("/materials");
  revalidatePath("/");
  return { success: true };
}
