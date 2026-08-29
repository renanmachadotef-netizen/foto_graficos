"use client";

import React, { useState, useMemo } from "react";
import {
  Wheat,
  Plus,
  Tractor,
  Droplet,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TenantConfig } from "@/lib/tenant";
import {
  createPlantationFieldAction,
  recordAgriculturalCostAction,
  recordMillingRunAction,
} from "./actions";

interface MillingClientViewProps {
  fields: any[];
  agriculturalCosts: any[];
  millingRuns: any[];
  tenantConfig: TenantConfig;
}

export function MillingClientView({
  fields,
  agriculturalCosts,
  millingRuns,
  tenantConfig,
}: MillingClientViewProps) {
  // Modal states
  const [isMillingOpen, setIsMillingOpen] = useState(false);
  const [isCostOpen, setIsCostOpen] = useState(false);
  const [isFieldOpen, setIsFieldOpen] = useState(false);

  // Milling Form State
  const [millingFieldId, setMillingFieldId] = useState(fields.length > 0 ? fields[0].id : "none");
  const [millingBatch, setMillingBatch] = useState(`MOAGEM-${new Date().getFullYear()}/01`);
  const [caneTons, setCaneTons] = useState("5.0");
  const [millingHours, setMillingHours] = useState("4.0");
  const [juiceLiters, setJuiceLiters] = useState("3200");
  const [sugarBrix, setSugarBrix] = useState("19.0");
  const [operationalCost, setOperationalCost] = useState("450.00");
  const [millingNotes, setMillingNotes] = useState("");

  // Cost Form State
  const [costFieldId, setCostFieldId] = useState(fields.length > 0 ? fields[0].id : "none");
  const [costCategory, setCostCategory] = useState("CORTE_TERCEIROS");
  const [costDescription, setCostDescription] = useState("");
  const [costAmount, setCostAmount] = useState("600.00");
  const [costDate, setCostDate] = useState(new Date().toISOString().split("T")[0]);

  // Field Form State
  const [fieldName, setFieldName] = useState("");
  const [fieldVariety, setFieldVariety] = useState("RB867515");
  const [fieldArea, setFieldArea] = useState("3.0");
  const [fieldEstimatedTons, setFieldEstimatedTons] = useState("120");

  const [loading, setLoading] = useState(false);

  // Metrics
  const totalJuiceLiters = useMemo(() => {
    return millingRuns.reduce((acc, m) => acc + m.juiceLiters, 0);
  }, [millingRuns]);

  const totalCaneTons = useMemo(() => {
    return millingRuns.reduce((acc, m) => acc + m.caneTons, 0);
  }, [millingRuns]);

  const avgBrix = useMemo(() => {
    if (millingRuns.length === 0) return 18.5;
    return (millingRuns.reduce((acc, m) => acc + m.sugarBrix, 0) / millingRuns.length).toFixed(1);
  }, [millingRuns]);

  const totalAgriCosts = useMemo(() => {
    return agriculturalCosts.reduce((acc, c) => acc + c.amount, 0);
  }, [agriculturalCosts]);

  const handleRecordMilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await recordMillingRunAction({
        fieldId: millingFieldId,
        batchNumber: millingBatch,
        caneTons: parseFloat(caneTons) || 0,
        millingHours: parseFloat(millingHours) || 0,
        juiceLiters: parseFloat(juiceLiters) || 0,
        sugarBrix: parseFloat(sugarBrix) || 18,
        operationalCost: parseFloat(operationalCost) || 0,
        notes: millingNotes,
      });
      setIsMillingOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleRecordCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await recordAgriculturalCostAction({
        fieldId: costFieldId,
        category: costCategory,
        description: costDescription,
        amount: parseFloat(costAmount) || 0,
        date: costDate,
      });
      setIsCostOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPlantationFieldAction({
        name: fieldName,
        variety: fieldVariety,
        areaHectares: parseFloat(fieldArea) || 0,
        estimatedTons: parseFloat(fieldEstimatedTons) || 0,
      });
      setIsFieldOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Lovable Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-amber-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            <Wheat className="w-4 h-4 text-emerald-300" />
            Canavial, Colheita & Moagem
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Módulo Agrícola & Moenda
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Controle do plantio, custo do corte de cana, abastecimento do trator e moagem de garapa com medição de °Brix e rendimento por tonelada.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsMillingOpen(true)}
            className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black shadow-xl shadow-emerald-950/40 rounded-2xl gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <Droplet className="w-5 h-5 text-emerald-900" />
            Nova Moagem de Garapa
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsCostOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-emerald-300/40 backdrop-blur-md rounded-2xl font-bold gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <Tractor className="w-4 h-4 text-emerald-300" />
            Lançar Custo / Frota
          </Button>

          <Button
            size="lg"
            variant="ghost"
            onClick={() => setIsFieldOpen(true)}
            className="text-emerald-200 hover:bg-white/10 rounded-2xl font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Talhão
          </Button>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🌾
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Garapa Extraída</span>
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalJuiceLiters.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">Litros</span>
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1">
              Caldo bruto para fermentação
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Cana Moída</span>
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Wheat className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalCaneTons.toFixed(1)} <span className="text-xs font-semibold text-slate-500">Toneladas</span>
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1">
              {fields.length} talhões registrados
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Média °Brix</span>
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {avgBrix}° <span className="text-xs font-semibold text-slate-500">Brix</span>
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1">
              Teor de açúcar ideal da garapa
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Custos Agrícolas</span>
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              R$ {totalAgriCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1">
              Corte, frete e frota
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Grid: Milling History + Fields / Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Milling Runs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-emerald-600" />
            Histórico de Moagens de Cana
          </h2>

          {millingRuns.length === 0 && (
            <Card className="p-8 text-center border-2 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/40">
              <Wheat className="w-10 h-10 text-emerald-600/60 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-950">Nenhuma moagem registrada ainda.</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">Clique em "Nova Moagem de Garapa" para lançar a primeira safra.</p>
            </Card>
          )}

          <div className="space-y-3">
            {millingRuns.map((run) => (
              <Card key={run.id} className="rounded-3xl border-emerald-200/80 p-5 bg-white shadow-xs hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">{run.batchNumber}</h3>
                      <Badge className="bg-emerald-100 text-emerald-900 font-black text-[10px]">
                        {run.sugarBrix}° Brix
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Talhão: <strong>{run.field?.name || "Geral"}</strong> • {new Date(run.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Garapa Obtida</span>
                    <span className="text-lg font-black text-emerald-700">{run.juiceLiters.toLocaleString("pt-BR")} L</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-emerald-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Cana Moída</span>
                    <span className="font-black text-slate-900">{run.caneTons} Ton</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Rendimento</span>
                    <span className="font-black text-slate-900">{run.yieldLitersPerTon.toFixed(0)} L/Ton</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Custo Garapa</span>
                    <span className="font-black text-emerald-800">R$ {run.costPerLiterJuice.toFixed(3)}/L</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Agricultural Costs & Fields (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Fields */}
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-600" />
              Talhões & Variedades de Cana ({fields.length})
            </h2>

            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{f.name}</h4>
                    <p className="text-xs text-slate-500">Variedade: <strong>{f.variety}</strong> ({f.areaHectares} ha)</p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl">
                    ~{f.estimatedTons} Ton
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Agricultural Costs */}
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-slate-700" />
              Despesas de Colheita & Frota
            </h2>

            <div className="space-y-2">
              {agriculturalCosts.map((c) => (
                <div key={c.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{c.description}</p>
                    <span className="text-[10px] text-slate-400">{c.category.replace("_", " ")} • {new Date(c.date).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    R$ {c.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: NOVA MOAGEM */}
      <Dialog open={isMillingOpen} onOpenChange={setIsMillingOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-emerald-600" />
              Registrar Nova Moagem de Cana
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Grave o volume de garapa bruta, o grau Brix medido e os custos da moenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordMilling} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote da Moagem *</Label>
                <Input
                  required
                  value={millingBatch}
                  onChange={(e) => setMillingBatch(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Talhão de Origem</Label>
                <select
                  value={millingFieldId}
                  onChange={(e) => setMillingFieldId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                >
                  <option value="none">Geral / Sem talhão</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.variety})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Cana Moída (Ton)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={caneTons}
                  onChange={(e) => setCaneTons(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Horas de Moenda</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={millingHours}
                  onChange={(e) => setMillingHours(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Garapa Obtida (Litros) *</Label>
                <Input
                  type="number"
                  required
                  value={juiceLiters}
                  onChange={(e) => setJuiceLiters(e.target.value)}
                  className="rounded-xl text-base font-black text-emerald-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Grau °Brix Medido *</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={sugarBrix}
                  onChange={(e) => setSugarBrix(e.target.value)}
                  className="rounded-xl text-base font-black text-amber-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Custo Operacional da Moagem (R$)</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={operationalCost}
                onChange={(e) => setOperationalCost(e.target.value)}
                placeholder="Diesel trator + diaristas"
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl py-5 cursor-pointer text-sm"
              >
                {loading ? "Gravando..." : "Salvar Moagem de Garapa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: LANÇAR CUSTO AGRÍCOLA */}
      <Dialog open={isCostOpen} onOpenChange={setIsCostOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-amber-600" />
              Lançar Custo de Colheita / Frota
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordCost} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Categoria da Despesa</Label>
              <select
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
              >
                <option value="CORTE_TERCEIROS">Corte de Cana (Diaristas / Terceiros)</option>
                <option value="FROTA_TRATOR_DIESEL">Óleo Diesel Trator / Carreta</option>
                <option value="MANUTENCAO_CAMINHAO">Manutenção de Caminhão / Moenda</option>
                <option value="FERTILIZANTES">Adubação & Fertilizantes</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Descrição</Label>
              <Input
                required
                value={costDescription}
                onChange={(e) => setCostDescription(e.target.value)}
                placeholder="Ex: Diária de 4 cortadores no Talhão 1"
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  className="rounded-xl text-base font-black text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Data</Label>
                <Input
                  type="date"
                  required
                  value={costDate}
                  onChange={(e) => setCostDate(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold rounded-2xl py-5">
                {loading ? "Salvando..." : "Gravar Despesa Agrícola"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO TALHÃO */}
      <Dialog open={isFieldOpen} onOpenChange={setIsFieldOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-emerald-600" />
              Cadastrar Talhão / Roça
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateField} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nome do Talhão *</Label>
              <Input
                required
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Ex: Talhão 02 - Encosta do Rio"
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Variedade da Cana</Label>
              <Input
                required
                value={fieldVariety}
                onChange={(e) => setFieldVariety(e.target.value)}
                placeholder="Ex: RB867515, Caninha Rosa"
                className="rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Área (Hectares)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={fieldArea}
                  onChange={(e) => setFieldArea(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Estimativa (Ton)</Label>
                <Input
                  type="number"
                  required
                  value={fieldEstimatedTons}
                  onChange={(e) => setFieldEstimatedTons(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-emerald-800 text-white font-bold rounded-2xl py-5">
                {loading ? "Salvando..." : "Salvar Talhão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
