import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";
import { EmployeeForm } from "./EmployeeForm";
import { Trash2 } from "lucide-react";
import { deleteEmployee } from "./actions";
import { EditEmployeeDialog } from "./EditEmployeeDialog";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const employees = await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Funcionários & Equipe</h1>
        <p className="text-muted-foreground">Gestão da equipe e cálculo inteligente do Custo de Hora-Funcionário.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <EmployeeForm />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-700">Equipe Registrada</h2>
          
          {employees.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">Nenhum funcionário cadastrado nesta empresa ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Preencha o formulário ao lado para adicionar o primeiro.</p>
            </div>
          )}
          
          <div className="grid gap-3">
            {employees.map(emp => (
              <div key={emp.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{emp.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">{emp.contractType.replace("_", " ")}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">{emp.weeklyHours}h/sem</span>
                  </div>
                  <div className="mt-3 text-sm text-slate-500 grid grid-cols-2 gap-x-4 gap-y-1">
                    <p>Salário: <strong className="text-slate-700">R$ {emp.baseSalary.toFixed(2)}</strong></p>
                    <p>Benefícios: <strong className="text-slate-700">R$ {emp.benefits.toFixed(2)}</strong></p>
                    <p>Tributos: <strong className="text-slate-700">{emp.taxesPercentage}%</strong></p>
                    <p>Eficiência: <strong className="text-slate-700">{emp.efficiencyPercentage}%</strong></p>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-6 border-l pl-6 ml-2">
                  <div className="text-center">
                    <p className="text-[10px] tracking-wider text-slate-400 uppercase font-bold mb-1">Custo/Hora</p>
                    <p className="text-2xl font-black text-blue-600">R$ {emp.hourlyCost.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center">
                    <EditEmployeeDialog employee={emp} />
                    <form action={async () => { "use server"; await deleteEmployee(emp.id); }}>
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
