import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { MillingClientView } from "./MillingClientView";

export const dynamic = "force-dynamic";

export default async function MillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const [fields, agriculturalCosts, millingRuns] = await Promise.all([
    prisma.plantationField.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.agriculturalCost.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.millingRun.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
      include: { field: true },
      take: 10,
    }),
  ]);

  return (
    <MillingClientView
      fields={fields}
      agriculturalCosts={agriculturalCosts}
      millingRuns={millingRuns}
      tenantConfig={tenantConfig}
    />
  );
}
