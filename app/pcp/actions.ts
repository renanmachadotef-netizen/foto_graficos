"use server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function updateOrderStatus(id: string, newStatus: string) {
  await prisma.serviceOrder.update({
    where: { id },
    data: { status: newStatus }
  });
  revalidatePath("/pcp");
}
