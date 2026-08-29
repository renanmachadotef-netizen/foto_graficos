import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";
import { KanbanBoard } from "./KanbanBoard";

export const dynamic = "force-dynamic";

export default async function PcpPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      quote: { tenantId },
    },
    include: {
      quote: {
        include: { client: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">PCP - Fila de Produção</h1>
        <p className="text-muted-foreground">Acompanhe as Ordens de Serviço (OS) em tempo real pela fábrica.</p>
      </div>

      <KanbanBoard orders={orders} />
    </div>
  );
}
