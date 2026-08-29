import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { BarrelsClientView } from "./BarrelsClientView";

export const dynamic = "force-dynamic";

export default async function BarrelsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const [barrels, bottlingRuns, yearlyMovements] = await Promise.all([
    prisma.barrel.findMany({
      where: { tenantId },
      include: {
        movements: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.bottlingRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.barrelMovement.findMany({
      where: {
        tenantId,
        type: "INPUT",
        date: { gte: startOfYear },
      },
    }),
  ]);

  const yearlyProducedLiters = yearlyMovements.reduce((acc, m) => acc + m.liters, 0);

  return (
    <BarrelsClientView
      initialBarrels={barrels}
      bottlingRuns={bottlingRuns}
      yearlyProducedLiters={yearlyProducedLiters}
      tenantConfig={tenantConfig}
      userRole={session.role}
    />
  );
}
