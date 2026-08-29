import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";
import { FinancialClientView } from "./FinancialClientView";

export const dynamic = "force-dynamic";

export default async function FinancialPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const [fixedCosts, transactions, clients] = await Promise.all([
    prisma.fixedCost.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: { tenantId },
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
      where: { tenantId },
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
