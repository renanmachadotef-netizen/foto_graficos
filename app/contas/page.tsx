import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { garantirContasFixas } from "./actions";
import { ContasClientView, type ContaCard, type ContaFixa } from "./ContasClientView";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const sessao = await getSession();
  if (!sessao) redirect("/login");
  if (!["ADMIN", "MANAGER"].includes(sessao.role)) redirect("/");

  await garantirContasFixas();

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const [contas, fixas] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        type: "EXPENSE",
        OR: [{ status: "PENDING" }, { status: "PAID", paymentDate: { gte: trintaDiasAtras } }],
      },
      orderBy: { dueDate: "asc" },
      include: { files: { select: { id: true, name: true, mime: true, size: true } } },
    }),
    prisma.recurringBill.findMany({ where: { active: true }, orderBy: { dueDay: "asc" } }),
  ]);

  const cards: ContaCard[] = contas.map((c) => ({
    id: c.id,
    description: c.description,
    supplier: c.supplier,
    amount: c.amount,
    dueDate: c.dueDate.toISOString().slice(0, 10),
    paymentDate: c.paymentDate ? c.paymentDate.toISOString().slice(0, 10) : null,
    status: c.status === "PAID" ? "PAID" : "PENDING",
    category: c.category,
    barcode: c.barcode,
    notes: c.notes,
    needsReview: c.needsReview,
    fixa: !!c.recurringBillId,
    files: c.files,
  }));

  const fixasUi: ContaFixa[] = fixas.map((f) => ({
    id: f.id,
    name: f.name,
    dueDay: f.dueDay,
    expectedAmount: f.expectedAmount,
    category: f.category,
    notes: f.notes,
  }));

  return <ContasClientView contas={cards} fixas={fixasUi} />;
}
