import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { PdvClientView } from "./PdvClientView";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const [products, materials, clients, companySettings] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.companySettings.findFirst({
      where: { tenantId },
    }),
  ]);

  return (
    <PdvClientView
      initialProducts={products}
      materials={materials}
      clients={clients}
      companySettings={companySettings}
      userName={session.name}
      tenantConfig={tenantConfig}
    />
  );
}
