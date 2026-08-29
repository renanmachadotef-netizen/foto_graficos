import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "./KanbanBoard";

export default async function PcpPage() {
  const orders = await prisma.serviceOrder.findMany({
    include: {
      quote: {
        include: { client: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">PCP - Controle de Produção</h1>
        <p className="text-muted-foreground">Acompanhe as Ordens de Serviço (OS) em tempo real pela fábrica.</p>
      </div>

      <KanbanBoard orders={orders} />
    </div>
  );
}
