import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign,
  TrendingUp,
  Package,
  PackageSearch,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  PlusCircle,
  Calculator,
  FileText,
  Target,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch all necessary data concurrently
  const [
    companySettings,
    fixedCosts,
    employees,
    machines,
    quotes,
    serviceOrders,
    transactions,
    materials,
  ] = await Promise.all([
    prisma.companySettings.findFirst(),
    prisma.fixedCost.findMany(),
    prisma.employee.findMany(),
    prisma.machine.findMany(),
    prisma.quote.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: true },
    }),
    prisma.serviceOrder.findMany({
      where: { status: { in: ["WAITING", "PREPRESS", "PRINTING", "FINISHING"] } },
    }),
    prisma.financialTransaction.findMany(),
    prisma.material.findMany(),
  ]);

  // 1. Calculate Total Fixed Costs (Monthly Operating Cost)
  const baseSettingsCost =
    (companySettings?.rent || 0) +
    (companySettings?.energy || 0) +
    (companySettings?.internet || 0) +
    (companySettings?.otherFixed || 0);

  const customFixedCosts = fixedCosts.reduce((acc, f) => acc + f.amount, 0);
  const employeeSalaries = employees.reduce((acc, e) => acc + e.baseSalary + e.benefits, 0);
  const machineMaintenance = machines.reduce((acc, m) => acc + m.maintenanceCost, 0);

  const totalMonthlyFixedCosts = baseSettingsCost + customFixedCosts + employeeSalaries + machineMaintenance;

  // 2. Financial Metrics
  const paidIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PENDING")
    .reduce((acc, t) => acc + t.amount, 0);

  const approvedQuotes = quotes.filter((q) => q.status === "APPROVED");
  const totalApprovedSales = approvedQuotes.reduce((acc, q) => acc + q.finalPrice, 0);

  // 3. Break-Even (Ponto de Equilíbrio) Calculation
  const revenueForBreakEven = paidIncome > 0 ? paidIncome : totalApprovedSales;
  const breakEvenProgress = totalMonthlyFixedCosts > 0
    ? Math.min(100, Math.round((revenueForBreakEven / totalMonthlyFixedCosts) * 100))
    : 100;

  // 4. Stock Alerts
  const criticalMaterials = materials.filter((m) => m.minStock > 0 && m.currentStock <= m.minStock);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Visão Geral Executiva
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {session.name.split(" ")[0]}!
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Acompanhe o faturamento, ponto de equilíbrio, ordens no chão de fábrica e alertas de reposição em tempo real.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <a href="/pricing">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-md">
              <Calculator className="w-4 h-4" />
              Calculadora
            </Button>
          </a>
          <a href="/quotes">
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs gap-1.5">
              <FileText className="w-4 h-4" />
              Novo Orçamento
            </Button>
          </a>
          <a href="/materials">
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs gap-1.5">
              <Package className="w-4 h-4" />
              Entrada Estoque
            </Button>
          </a>
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturado / Recebido</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                R$ {paidIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Receitas confirmadas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">A Receber Pendente</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
                R$ {pendingIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Vendas em aberto / sinal</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produção Ativa (PCP)</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{serviceOrders.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ordens em andamento</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PackageSearch className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 shadow-xs ${criticalMaterials.length > 0 ? "bg-rose-50/60 border-rose-200" : "bg-white"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Estoque Crítico</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-0.5">{criticalMaterials.length}</p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">
                {criticalMaterials.length > 0 ? "Insumos para repor" : "Todos os insumos OK"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Ponto de Equilíbrio + Status da Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Break-Even Progress Card */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200 bg-white shadow-xs h-full flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    Ponto de Equilíbrio Operacional (Break-Even)
                  </CardTitle>
                </div>
                <Badge variant={breakEvenProgress >= 100 ? "success" : "warning"} className="text-xs font-bold">
                  {breakEvenProgress}% Atingido
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Faturamento necessário para cobrir todos os custos fixos mensais (aluguel, energia, salários e máquinas).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">
                    Faturado: <strong>R$ {revenueForBreakEven.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="text-slate-600">
                    Custo Fixo Total: <strong>R$ {totalMonthlyFixedCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      breakEvenProgress >= 100
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-indigo-500 to-indigo-600"
                    }`}
                    style={{ width: `${breakEvenProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Custos Infra</p>
                  <p className="font-bold text-slate-800">
                    R$ {(baseSettingsCost + customFixedCosts).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Folha / Equipe</p>
                  <p className="font-bold text-slate-800">
                    R$ {employeeSalaries.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Manut. Máquinas</p>
                  <p className="font-bold text-slate-800">
                    R$ {machineMaintenance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reposição de Estoque Urgente Card */}
        <div className="lg:col-span-5">
          <Card className="border-slate-200 bg-white shadow-xs h-full flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Insumos com Estoque Baixo
                </CardTitle>
                <a href="/materials" className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-0.5">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {criticalMaterials.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  🎉 Nenhum insumo está abaixo do estoque de segurança no momento!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {criticalMaterials.slice(0, 4).map((mat) => (
                    <div
                      key={mat.id}
                      className="p-2.5 rounded-lg border border-rose-100 bg-rose-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{mat.name}</p>
                        <p className="text-[10px] text-slate-500">
                          Mínimo: {mat.minStock} {mat.unit}
                        </p>
                      </div>
                      <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {mat.currentStock} {mat.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Recent Quotes / Sales Pipeline */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Últimos Orçamentos & Vendas</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Propostas comerciais geradas no sistema
            </CardDescription>
          </div>
          <a href="/quotes">
            <Button size="sm" variant="outline" className="text-xs">
              Ver Todos os Orçamentos
            </Button>
          </a>
        </CardHeader>

        <CardContent className="p-0">
          {quotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum orçamento cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{q.title}</span>
                      <Badge
                        variant={
                          q.status === "APPROVED"
                            ? "success"
                            : q.status === "SENT"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {q.status === "APPROVED"
                          ? "Aprovado"
                          : q.status === "SENT"
                          ? "Enviado"
                          : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cliente: <strong className="text-slate-700">{q.client.name}</strong> • {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Valor Final</p>
                      <p className="font-extrabold text-sm text-slate-900">
                        R$ {q.finalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <a href={`/quotes/${q.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs text-indigo-600 hover:bg-indigo-50">
                        Abrir
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
