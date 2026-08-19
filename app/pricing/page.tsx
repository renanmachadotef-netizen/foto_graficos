import { PrismaClient } from "@prisma/client";
import { PricingCalculator } from "./PricingCalculator";

const prisma = new PrismaClient();

export default async function PricingPage() {
  const materials = await prisma.material.findMany();
  const machines = await prisma.machine.findMany();
  const employees = await prisma.employee.findMany();
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Orçamentos & Precificação</h1>
        <p className="text-muted-foreground">Monte roteiros de produção e simule orçamentos em escala justa.</p>
      </div>

      <PricingCalculator 
        materials={materials} 
        machines={machines} 
        employees={employees} 
        clients={clients}
      />
    </div>
  );
}
