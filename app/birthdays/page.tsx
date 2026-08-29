import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";
import { BirthdaysClientView } from "./BirthdaysClientView";

export const dynamic = "force-dynamic";

export default async function BirthdaysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];

  // Fetch all clients that have birthday information
  const clientsWithBirthday = await prisma.client.findMany({
    where: {
      tenantId,
      birthMonth: { not: null },
      birthDay: { not: null },
    },
    orderBy: [
      { birthMonth: "asc" },
      { birthDay: "asc" },
    ],
  });

  const totalClients = await prisma.client.count({
    where: { tenantId },
  });

  const currentMonth = new Date().getMonth() + 1; // 1 - 12
  const currentDay = new Date().getDate(); // 1 - 31

  return (
    <BirthdaysClientView
      clientsWithBirthday={clientsWithBirthday}
      totalClients={totalClients}
      currentMonth={currentMonth}
      currentDay={currentDay}
      tenantConfig={tenantConfig}
    />
  );
}
