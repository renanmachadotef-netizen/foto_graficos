import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData, TENANT_CONFIGS } from "@/lib/tenant";
import { EmployeeForm } from "./EmployeeForm";
import { Trash2, Crown, Users, DollarSign, Clock, Sparkles, UserCheck, Briefcase } from "lucide-react";
import { deleteEmployee } from "./actions";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];
  const isPuraBrasil = tenantId === "PURABRASIL";

  const employees = await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  // Calculate metrics
  const owners = employees.filter((e) => e.contractType === "PROPRIETARIO_PROLABORE");
  const staff = employees.filter((e) => e.contractType !== "PROPRIETARIO_PROLABORE");

  const totalProLabore = owners.reduce((acc, e) => acc + e.baseSalary + e.benefits, 0);
  const totalStaffSalary = staff.reduce((acc, e) => acc + e.baseSalary + e.benefits, 0);

  const totalMonthlyPayroll = employees.reduce((acc, e) => {
    const taxes = e.baseSalary * (e.taxesPercentage / 100);
    return acc + e.baseSalary + e.benefits + taxes;
  }, 0);

  const avgHourlyCost =
    employees.length > 0
      ? employees.reduce((acc, e) => acc + e.hourlyCost, 0) / employees.length
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border ${
          isPuraBrasil
            ? "bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-950 border-amber-700/50"
            : "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40"
        }`}
      >
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isPuraBrasil ? "bg-amber-500/20 text-amber-300 border border-amber-400/30" : "bg-indigo-500/20 text-indigo-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Gestão de Equipe & Pró-Labore
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Equipe, Sócios & Custo-Hora
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed font-normal">
            Cadastre os proprietários com seus respectivos **pró-labores** e a equipe operacional (CLT/PJ) para compor os custos fixos e a formação de preço de venda.
          </p>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          👑
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">👑 Pró-Labore Sócios</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              R$ {totalProLabore.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              {owners.length} {owners.length === 1 ? "proprietário" : "sócios"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">👥 Folha Operacional</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              R$ {totalStaffSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-indigo-700 font-medium mt-1">
              {staff.length} colaboradores (CLT / PJ)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">💰 Custo Total Folha</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              R$ {totalMonthlyPayroll.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Salários + Encargos + Pró-labore
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">⏱️ Média Hora-Homem</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2">
              R$ {avgHourlyCost.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ hora</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Custo produtivo real
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Form + Team List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <EmployeeForm />
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Quadro de Membros Registrados ({employees.length})
            </h2>
          </div>

          {employees.length === 0 && (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Crown className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-700">Nenhum membro ou proprietário cadastrado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                Utilize o formulário ao lado para cadastrar o proprietário e seu pró-labore.
              </p>
            </div>
          )}

          <div className="grid gap-3.5">
            {employees.map((emp) => {
              const isOwner = emp.contractType === "PROPRIETARIO_PROLABORE";

              return (
                <div
                  key={emp.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs hover:shadow-md ${
                    isOwner
                      ? "bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 border-amber-300/80"
                      : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        {isOwner && <Crown className="w-5 h-5 text-amber-600 shrink-0" />}
                        {emp.name}
                      </h3>

                      {isOwner ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                          👑 Proprietário • Pró-Labore
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {emp.contractType.replace("_", " ")}
                        </Badge>
                      )}

                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {emp.weeklyHours}h / semana
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                      <p>
                        {isOwner ? "Pró-Labore:" : "Salário:"}{" "}
                        <strong className="text-slate-900">R$ {emp.baseSalary.toFixed(2)}</strong>
                      </p>
                      <p>
                        {isOwner ? "Retiradas:" : "Benefícios:"}{" "}
                        <strong className="text-slate-900">R$ {emp.benefits.toFixed(2)}</strong>
                      </p>
                      <p>
                        Encargos: <strong className="text-slate-900">{emp.taxesPercentage}%</strong>
                      </p>
                      <p>
                        Eficiência: <strong className="text-slate-900">{emp.efficiencyPercentage}%</strong>
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex sm:flex-col md:flex-row items-center justify-between sm:justify-end gap-4 sm:border-l border-slate-100 sm:pl-5 pt-3 sm:pt-0 border-t sm:border-t-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] tracking-wider text-slate-400 uppercase font-black">
                        Custo Hora Real
                      </p>
                      <p className="text-2xl font-black text-indigo-600">
                        R$ {emp.hourlyCost.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <EditEmployeeDialog employee={emp} />
                      <form
                        action={async () => {
                          "use server";
                          await deleteEmployee(emp.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
