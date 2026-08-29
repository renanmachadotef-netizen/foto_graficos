import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { RecipesClientView } from "./RecipesClientView";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  const recipes = await prisma.recipe.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <RecipesClientView
      initialRecipes={recipes}
      tenantConfig={tenantConfig}
      userRole={session.role}
    />
  );
}
