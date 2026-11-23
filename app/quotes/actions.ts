"use server";
import { exigirPapel, exigirPapelAcao } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approveQuote(quoteId: string) {
  await exigirPapelAcao(["ADMIN", "MANAGER", "SELLER"]);
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "APPROVED" },
    include: { client: true }
  });
  
  // Create Service Order automatically
  const existingOs = await prisma.serviceOrder.findUnique({ where: { quoteId } });
  if (!existingOs) {
    await prisma.serviceOrder.create({
      data: { quoteId, status: "WAITING" }
    });
  }

  // Create Accounts Receivable (FinancialTransaction) automatically if not already created
  const existingTransaction = await prisma.financialTransaction.findFirst({
    where: { quoteId }
  });
  if (!existingTransaction) {
    await prisma.financialTransaction.create({
      data: {
        quoteId,
        clientId: quote.clientId,
        type: "INCOME",
        status: "PENDING",
        description: `Venda Orç. #${quote.id.slice(-5).toUpperCase()} - ${quote.title}`,
        amount: quote.finalPrice,
        dueDate: new Date(),
        category: "Vendas",
        notes: `Gerado automaticamente da aprovação do orçamento.`
      }
    });
  }

  revalidatePath("/quotes");
  revalidatePath("/financial");
  revalidatePath("/pcp");
}

export async function rejectQuote(quoteId: string) {
  await exigirPapelAcao(["ADMIN", "MANAGER", "SELLER"]);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "REJECTED" }
  });

  await prisma.financialTransaction.updateMany({
    where: { quoteId, status: "PENDING" },
    data: { status: "CANCELLED" }
  });

  revalidatePath("/quotes");
  revalidatePath("/financial");
}

/** Apaga orçamento que nunca virou venda (gerente ou administrador) ou venda já cancelada (só administrador). */
export async function excluirOrcamento(quoteId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await exigirPapelAcao(["ADMIN", "MANAGER"]);
  const q = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      status: true,
      isPosSale: true,
      serviceOrder: { select: { id: true } },
      transactions: { select: { status: true } },
    },
  });
  if (!q) return { ok: false, erro: "Orçamento não encontrado (talvez já tenha sido excluído)." };
  if (q.status === "CANCELLED") {
    // venda ou pedido já cancelado em Vendas (estoque e caixa já foram acertados): só o administrador apaga de vez
    if (sessao.role !== "ADMIN") return { ok: false, erro: "Só o administrador pode apagar de vez uma venda cancelada." };
  } else if (q.isPosSale) {
    return { ok: false, erro: "Isso é uma venda do balcão. Cancele em Vendas primeiro; depois o administrador pode apagar aqui." };
  } else if (q.status !== "DRAFT" && q.status !== "REJECTED") {
    return { ok: false, erro: "Orçamento aprovado não pode ser excluído. Cancele a venda em Vendas." };
  }
  if (q.serviceOrder) return { ok: false, erro: "Esse orçamento já tem ordem de produção." };
  if (q.transactions.some((t) => t.status === "PAID")) return { ok: false, erro: "Esse orçamento já tem pagamento registrado." };

  // lançamentos pendentes ligados ao orçamento saem junto (o banco só solta o vínculo, não apaga)
  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({ where: { quoteId, status: { in: ["PENDING", "CANCELLED"] } } }),
    prisma.quote.delete({ where: { id: quoteId } }),
  ]);

  revalidatePath("/quotes");
  revalidatePath("/financial");
  return { ok: true };
}
