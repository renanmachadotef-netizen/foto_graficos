import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MaterialForm } from "./MaterialForm";
import { EditMaterialDialog } from "./EditMaterialDialog";
import { StockMovementDialog } from "./StockMovementDialog";
import { deleteMaterial } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  AlertTriangle,
  Boxes,
  DollarSign,
  Maximize2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Layers,
} from "lucide-react";

import { getCurrentTenant, ensureTenantInitialData, TENANT_CONFIGS } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);
  const tenantConfig = TENANT_CONFIGS[tenantId];
  const isPuraBrasil = tenantId === "PURABRASIL";

  const materials = await prisma.material.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  const recentMovements = await prisma.stockMovement.findMany({
    where: { material: { tenantId } },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      material: true,
      user: true,
    },
  });

  // Calculate Metrics
  const totalItems = materials.length;
  const totalStockValue = materials.reduce((acc, m) => acc + m.currentStock * m.unitCost, 0);
  const criticalItems = materials.filter((m) => m.minStock > 0 && m.currentStock <= m.minStock);

  const categoryLabels: Record<string, { label: string; color: string }> = {
    // Foto & Gráficos
    VINIL_LONA: { label: "Lonas & Vinis", color: "bg-indigo-100 text-indigo-700" },
    RIGIDOS_CHAPAS: { label: "Chapas & Rígidos", color: "bg-sky-100 text-sky-700" },
    TINTAS_QUIMICOS: { label: "Tintas & Químicos", color: "bg-amber-100 text-amber-700" },
    ACESSORIOS: { label: "Acessórios", color: "bg-purple-100 text-purple-700" },
    // Pura Brasil
    CACHACA_GRANEL: { label: "Cachaça Granel / Barril", color: "bg-amber-100 text-amber-800" },
    GARRAFAS_VIDRO: { label: "Garrafas de Vidro", color: "bg-emerald-100 text-emerald-800" },
    TAMPAS_ROLHAS: { label: "Tampas & Rolhas", color: "bg-yellow-100 text-yellow-800" },
    ROTULOS_LACRES: { label: "Rótulos & Lacres", color: "bg-rose-100 text-rose-800" },
    EMBALAGENS_CAIXAS: { label: "Caixas & Embalagens", color: "bg-stone-200 text-stone-800" },
    OUTROS: { label: "Outros", color: "bg-slate-100 text-slate-700" },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-600" />
            Controle de Estoque & Insumos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de matérias-primas, mídias em rolo (m²), chapas rígidas, tintas e alertas de reposição.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Insumos</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalItems}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Itens cadastrados</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor em Estoque</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                R$ {totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Capital imobilizado</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 shadow-xs ${criticalItems.length > 0 ? "bg-rose-50/50 border-rose-200" : "bg-white"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Alerta de Reposição</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-0.5">{criticalItems.length}</p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">
                {criticalItems.length === 0 ? "Estoque normalizado" : "Itens abaixo do mínimo"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Últimas Movimentações</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{recentMovements.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Entradas e saídas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Form + Inventory List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-4">
          <MaterialForm />
        </div>

        {/* Right Column: Inventory Table */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Grade de Materiais em Estoque</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Monitore saldo atual, margem de perda e custo de aquisição
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {materials.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhum material cadastrado ainda. Use o formulário ao lado para começar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="font-bold text-xs text-slate-700">Insumo / Categoria</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-center">Saldo Atual</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Custo Unit.</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700">Valor Total</TableHead>
                        <TableHead className="font-bold text-xs text-slate-700 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((mat) => {
                        const isCritical = mat.minStock > 0 && mat.currentStock <= mat.minStock;
                        const cat = categoryLabels[mat.category] || categoryLabels.OUTROS;

                        return (
                          <TableRow key={mat.id} className="hover:bg-slate-50/60">
                            <TableCell className="py-3">
                              <div className="space-y-1">
                                <div className="font-bold text-sm text-slate-900">{mat.name}</div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cat.color}`}>
                                    {cat.label}
                                  </span>
                                  {mat.width && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                                      <Maximize2 className="w-3 h-3" /> {mat.width}m largura
                                    </span>
                                  )}
                                  {mat.wasteMargin > 0 && (
                                    <span className="text-[10px] text-amber-600 font-medium">
                                      +{mat.wasteMargin}% perda
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-center py-3">
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                                    isCritical
                                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                                      : mat.currentStock > 0
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {mat.currentStock.toFixed(2)} {mat.unit}
                                </span>
                                {mat.minStock > 0 && (
                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                    Mín: {mat.minStock} {mat.unit}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 text-xs font-semibold text-slate-700">
                              R$ {mat.unitCost.toFixed(2)} / {mat.unit}
                            </TableCell>

                            <TableCell className="py-3 text-xs font-bold text-slate-900">
                              R$ {(mat.currentStock * mat.unitCost).toFixed(2)}
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <StockMovementDialog material={mat} />
                                <EditMaterialDialog material={mat} />
                                <form
                                  action={async () => {
                                    "use server";
                                    await deleteMaterial(mat.id);
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-rose-50"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </form>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements History */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Histórico Recente de Entradas e Saídas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentMovements.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhuma movimentação manual registrada ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Insumo</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Qtd</TableHead>
                      <TableHead className="text-xs">Motivo / Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMovements.map((mov) => (
                      <TableRow key={mov.id} className="text-xs">
                        <TableCell className="text-slate-500">
                          {new Date(mov.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {mov.material.name}
                        </TableCell>
                        <TableCell>
                          {mov.type === "IN" ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              <ArrowUpRight className="w-3 h-3" /> Entrada
                            </span>
                          ) : mov.type === "OUT" || mov.type === "OS_OUT" ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                              <ArrowDownRight className="w-3 h-3" /> Saída
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              Ajuste
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {mov.quantity} {mov.material.unit}
                        </TableCell>
                        <TableCell className="text-slate-600">{mov.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
