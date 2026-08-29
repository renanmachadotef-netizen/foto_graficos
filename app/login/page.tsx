import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { ensureDefaultUsers } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const tenantId = await getCurrentTenant();
  await ensureDefaultUsers();
  await ensureTenantInitialData(tenantId);

  const tenantConfig = TENANT_CONFIGS[tenantId];

  return <LoginForm tenantConfig={tenantConfig} />;
}
