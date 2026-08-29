import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";
import { MachineForm } from "./MachineForm";
import { Trash2 } from "lucide-react";
import { deleteMachine } from "./actions";
import { EditMachineDialog } from "./EditMachineDialog";

export const dynamic = "force-dynamic";

export default async function MachinesPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const machines = await prisma.machine.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Maquinário & Equipamentos</h1>
        <p className="text-muted-foreground">Depreciação, manutenção e cálculo do Custo de Hora-Máquina.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <MachineForm />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-700">Equipamentos Registrados</h2>
          
          {machines.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">Nenhum equipamento cadastrado nesta empresa ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Utilize o formulário para adicionar seu maquinário.</p>
            </div>
          )}
          
          <div className="grid gap-3">
            {machines.map(mac => (
              <div key={mac.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full">
                  <h3 className="font-bold text-slate-800 text-lg">{mac.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded">
                      Aquisição: R$ {mac.acquisitionValue.toLocaleString('pt-BR')}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                      {mac.workingHours}h úteis/mês
                    </span>
                  </div>
                  
                  <div className="mt-3 text-sm text-slate-500 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Depreciação</p>
                      <p className="text-slate-700">R$ {(mac.acquisitionValue / mac.usefulLifeMonths).toFixed(2)}/mês</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-500/80">Manutenção (Prov.)</p>
                      <p className="text-slate-700">R$ {mac.maintenanceCost.toFixed(2)}/mês</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Potência Elétrica</p>
                      <p className="text-slate-700">{mac.powerConsumption}W</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-6 border-l pl-6 ml-2">
                  <div className="text-center min-w-24">
                    <p className="text-[10px] tracking-wider text-slate-400 uppercase font-bold mb-1">Custo/Hora</p>
                    <p className="text-2xl font-black text-blue-600">R$ {mac.hourlyCost.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center">
                    <EditMachineDialog machine={mac} />
                    <form action={async () => { "use server"; await deleteMachine(mac.id); }}>
                      <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 cursor-pointer">
                        <Trash2 size={20}/>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
