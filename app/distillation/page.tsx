import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { DistillationClientView } from "./DistillationClientView";

export const dynamic = "force-dynamic";

export default async function DistillationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const [distillations, fermentations, barrels] = await Promise.all([
    prisma.distillationRun.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
      take: 12,
    }),
    prisma.fermentationBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.barrel.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <DistillationClientView
      distillations={distillations}
      fermentations={fermentations}
      barrels={barrels}
      tenantConfig={tenantConfig}
    />
  );
}
