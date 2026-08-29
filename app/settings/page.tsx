import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, ensureTenantInitialData, TENANT_CONFIGS } from "@/lib/tenant";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const settings = (await prisma.companySettings.findFirst({
    where: { tenantId },
  })) || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurações da Empresa ({tenantConfig.shortName})
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure a identidade, CNPJ, dados de contato e chave PIX para {tenantConfig.name}.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
