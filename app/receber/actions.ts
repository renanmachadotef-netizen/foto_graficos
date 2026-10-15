"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Resultado = { ok: true } | { ok: false; erro: string };

async function permitido(): Promise<boolean> {
  const s = await getSession();
  return !!s && ["ADMIN", "MANAGER", "SELLER"].includes(s.role);
}

/** Registra que o cliente pagou (tudo ou so uma parte) uma conta a receber. */
export async function receberConta(
  id: string,
  p: { valor: number; data: string; forma: string },
): Promise<Resultado> {
  if (!(await permitido())) return { ok: false, erro: "Voce nao tem permissao." };
  const conta = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!conta || conta.type !== "INCOME" || conta.status !== "PENDING") {
    return { ok: false, erro: "Essa conta ja foi recebida ou nao existe." };
  }
  const valor = Math.round((Number(p.valor) || 0) * 100) / 100;
  if (valor <= 0) return { ok: false, erro: "Informe quanto o cliente pagou." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data)) return { ok: false, erro: "Escolha a data do recebimento." };
  const quando = new Date(`${p.data}T12:00:00`);

  if (valor >= conta.amount - 0.005) {
    // recebeu tudo (ou mais): fecha a propria conta
    await prisma.financialTransaction.update({
      where: { id },
      data: { status: "PAID", paymentDate: quando, paymentMethod: p.forma || null },
    });
  } else {
    // recebimento parcial: abate da conta e guarda o que entrou como um recebimento a parte
    await prisma.$transaction([
      prisma.financialTransaction.update({
        where: { id },
        data: { amount: Math.round((conta.amount - valor) * 100) / 100 },
      }),
      prisma.financialTransaction.create({
        data: {
          description: `Recebimento parcial: ${conta.description}`,
          amount: valor,
          type: "INCOME",
          status: "PAID",
          category: conta.category?.startsWith("Fiado") ? "Fiado" : conta.category,
          paymentMethod: p.forma || null,
          paymentDate: quando,
          dueDate: conta.dueDate,
          clientId: conta.clientId,
          notes: `recebimento-parcial:${conta.id}`,
        },
      }),
    ]);
  }
  revalidatePath("/receber");
  revalidatePath("/financial");
  return { ok: true };
}

/** Desfaz um recebimento (volta a conta para "a receber"). */
export async function desfazerRecebimento(id: string): Promise<Resultado> {
  if (!(await permitido())) return { ok: false, erro: "Voce nao tem permissao." };
  const conta = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!conta || conta.type !== "INCOME" || conta.status !== "PAID") return { ok: false, erro: "Nada para desfazer." };

  const origemId = conta.notes?.startsWith("recebimento-parcial:") ? conta.notes.split(":")[1] : null;
  if (origemId) {
    // era um pedaco: devolve o valor para a conta de origem e apaga o recebimento parcial
    const origem = await prisma.financialTransaction.findUnique({ where: { id: origemId } });
    if (origem) {
      await prisma.$transaction([
        prisma.financialTransaction.update({
          where: { id: origemId },
          data: { amount: Math.round((origem.amount + conta.amount) * 100) / 100 },
        }),
        prisma.financialTransaction.delete({ where: { id } }),
      ]);
      revalidatePath("/receber");
      return { ok: true };
    }
  }
  await prisma.financialTransaction.update({ where: { id }, data: { status: "PENDING", paymentDate: null } });
  revalidatePath("/receber");
  revalidatePath("/financial");
  return { ok: true };
}
