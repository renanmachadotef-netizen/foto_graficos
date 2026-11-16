"use server";
import { exigirPapel, exigirPapelAcao } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(id: string, newStatus: string) {
  await exigirPapelAcao(["ADMIN", "MANAGER", "PRODUCTION"]);
  await prisma.serviceOrder.update({
    where: { id },
    data: { status: newStatus }
  });
  revalidatePath("/pcp");
}
