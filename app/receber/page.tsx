import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReceberClientView, type ContaReceber } from "./ReceberClientView";

export const dynamic = "force-dynamic";

export default async function ReceberPage() {
  const sessao = await getSession();
  if (!sessao) redirect("/login");

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const [contas, empresa] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        type: "INCOME",
        OR: [
          { status: "PENDING" },
          { status: "PAID", category: { startsWith: "Fiado" }, paymentDate: { gte: trintaDiasAtras } },
        ],
      },
      orderBy: { dueDate: "asc" },
      include: { client: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.companySettings.findFirst({ select: { companyName: true, pixKey: true } }),
  ]);

  const cards: ContaReceber[] = contas.map((c) => ({
    id: c.id,
    description: c.description,
    amount: c.amount,
    dueDate: c.dueDate.toISOString().slice(0, 10),
    paymentDate: c.paymentDate ? c.paymentDate.toISOString().slice(0, 10) : null,
    status: c.status === "PAID" ? "PAID" : "PENDING",
    fiadoAntigo: c.category === "Fiado antigo",
    category: c.category,
    clienteNome: c.client?.name ?? "Sem cliente",
    clienteTelefone: c.client?.phone ?? null,
    forma: c.paymentMethod,
  }));

  return (
    <ReceberClientView
      contas={cards}
      empresa={empresa?.companyName || "Foto & Gráficos"}
      pix={empresa?.pixKey || null}
    />
  );
}
