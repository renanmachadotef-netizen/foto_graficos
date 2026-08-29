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

  const [barrels, bottlingRuns] = await Promise.all([
    prisma.barrel.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    }),
    prisma.bottlingRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <BarrelsClientView
      initialBarrels={barrels}
      bottlingRuns={bottlingRuns}
      tenantConfig={tenantConfig}
      userRole={session.role}
    />
  );
}
