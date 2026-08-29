import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { BottlingCalculatorClientView } from "./BottlingCalculatorClientView";

export const dynamic = "force-dynamic";

export default async function BottlingPage({
  searchParams,
}: {
  searchParams: Promise<{ barrelId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const resolvedParams = await searchParams;

  const [barrels, packagingMaterials, recentBottlings] = await Promise.all([
    prisma.barrel.findMany({
      where: { tenantId, currentLiters: { gt: 0 } },
      orderBy: { code: "asc" },
    }),
    prisma.material.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.bottlingRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <BottlingCalculatorClientView
      barrels={barrels}
      packagingMaterials={packagingMaterials}
      recentBottlings={recentBottlings}
      initialBarrelId={resolvedParams.barrelId}
      tenantConfig={tenantConfig}
    />
  );
}
