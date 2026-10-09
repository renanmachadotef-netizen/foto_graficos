import { prisma } from "@/lib/prisma";
import { ensureInitialData } from "@/lib/company";
import { FinancialClientView } from "./FinancialClientView";

export const dynamic = "force-dynamic";

export default async function FinancialPage() {
  await ensureInitialData();

  const [fixedCosts, transactions, clients] = await Promise.all([
    prisma.fixedCost.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.financialTransaction.findMany({
      orderBy: [
        { dueDate: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FinancialClientView
      transactions={transactions}
      clients={clients}
      fixedCosts={fixedCosts}
    />
  );
}
