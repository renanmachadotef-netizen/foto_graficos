import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { BlendsClientView } from "./BlendsClientView";

export const dynamic = "force-dynamic";

export default async function BlendsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const [barrels, blendBatches, liquorBatches] = await Promise.all([
    prisma.barrel.findMany({
      where: { tenantId, currentLiters: { gt: 0 } },
      orderBy: { code: "asc" },
    }),
    prisma.blendBatch.findMany({
      where: { tenantId },
      include: { items: { include: { barrel: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.liquorBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <BlendsClientView
      barrels={barrels}
      blendBatches={blendBatches}
      liquorBatches={liquorBatches}
      tenantConfig={tenantConfig}
    />
  );
}
