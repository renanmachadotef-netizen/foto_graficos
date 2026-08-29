"use client";

import React, { useState, useMemo } from "react";
import {
  Flame,
  Plus,
  Wine,
  Sparkles,
  Droplet,
  Percent,
  DollarSign,
  Layers,
  Clock,
  ArrowRight,
  ShieldAlert,
  Award,
  CheckCircle2,
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
import { recordDistillationRunAction } from "./actions";
import { WOOD_PROFILES } from "@/app/barrels/BarrelsClientView";

interface DistillationClientViewProps {
  distillations: any[];
  fermentations: any[];
  barrels: any[];
  tenantConfig: TenantConfig;
}

export function DistillationClientView({
  distillations,
  fermentations,
  barrels,
  tenantConfig,
}: DistillationClientViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState(`ALAMB-${new Date().getFullYear()}/01`);
  const [stillNumber, setStillNumber] = useState("Alambique de Cobre Capitel 1 (500L)");
  const [washVolumeInput, setWashVolumeInput] = useState("1000");
  const [headsLiters, setHeadsLiters] = useState("18");
  const [headsAbv, setHeadsAbv] = useState("65.0");
  const [heartsLiters, setHeartsLiters] = useState("160");
  const [heartsAbv, setHeartsAbv] = useState("44.0");
  const [tailsLiters, setTailsLiters] = useState("40");
  const [tailsAbv, setTailsAbv] = useState("15.0");
  const [totalRunCost, setTotalRunCost] = useState("1600.00");
  const [destinationBarrelId, setDestinationBarrelId] = useState(barrels.length > 0 ? barrels[0].id : "none");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Calculations for live preview
  const numWash = parseFloat(washVolumeInput) || 1000;
  const numHeads = parseFloat(headsLiters) || 0;
  const numHearts = parseFloat(heartsLiters) || 0;
  const numTails = parseFloat(tailsLiters) || 0;
  const numCost = parseFloat(totalRunCost) || 0;

  const totalDistillate = numHeads + numHearts + numTails;
  const heartsPercent = totalDistillate > 0 ? (numHearts / totalDistillate) * 100 : 0;
  const costPerLiterHeartPreview = numHearts > 0 ? numCost / numHearts : 0;

  // Global KPIs
  const totalHeartsObtained = useMemo(() => {
    return distillations.reduce((acc, d) => acc + d.heartsLiters, 0);
  }, [distillations]);

  const totalWashDistilled = useMemo(() => {
    return distillations.reduce((acc, d) => acc + d.washVolumeInput, 0);
  }, [distillations]);

  const avgCostPerHeart = useMemo(() => {
    if (distillations.length === 0) return 10.0;
    return (distillations.reduce((acc, d) => acc + d.costPerLiterHeart, 0) / distillations.length).toFixed(2);
  }, [distillations]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await recordDistillationRunAction({
        batchNumber,
        stillNumber,
        washVolumeInput: numWash,
        headsLiters: numHeads,
        headsAbv: parseFloat(headsAbv) || 65,
        heartsLiters: numHearts,
        heartsAbv: parseFloat(heartsAbv) || 44,
        tailsLiters: numTails,
        tailsAbv: parseFloat(tailsAbv) || 15,
        totalRunCost: numCost,
        destinationBarrelId,
        notes,
      });

      setIsOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-300" />
            Alambique de Cobre & Fracionamento
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Destilação & Cortes de Cachaça
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Fracionamento exato do alambique: descarte rigoroso da Cabeça, aproveitamento nobre do Coração e separação da Cauda. Todo o custo do lote recai sobre o volume do Coração.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-950/40 rounded-2xl gap-2 cursor-pointer text-xs sm:text-sm py-6 px-6 transform hover:scale-105 transition-all"
          >
            <Flame className="w-5 h-5 text-amber-950" />
            Registrar Alambicada
          </Button>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🔥
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Coração Produzido</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalHeartsObtained.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">Litros</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Cachaça nobre aproveitável
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Mosto Destilado</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalWashDistilled.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">L</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Volume total de mosto fermentado
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Custo Médio Coração</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              R$ {avgCostPerHeart} <span className="text-xs font-semibold text-slate-500">/ Litro</span>
            </p>
            <p className="text-xs text-emerald-700 font-bold mt-1">
              100% apropriado no Coração
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Alambicadas</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {distillations.length} <span className="text-xs font-semibold text-slate-500">Lotes</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Alambiques de cobre em operação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distillations List with Visual Cut Fractioning */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-600" />
          Histórico de Alambicadas & Fracionamento de Cortes
        </h2>

        {distillations.length === 0 && (
          <Card className="p-8 text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/40">
            <Flame className="w-10 h-10 text-amber-600/60 mx-auto mb-2" />
            <p className="text-sm font-bold text-amber-950">Nenhuma alambicada registrada ainda.</p>
            <p className="text-xs text-amber-800/80 mt-0.5">Clique em "Registrar Alambicada" para fracionar a primeira destilação.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {distillations.map((dist) => {
            const destBarrel = barrels.find((b) => b.id === dist.destinationBarrelId);

            return (
              <Card
                key={dist.id}
                className="rounded-3xl border-amber-200/80 p-5 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base">{dist.batchNumber}</h3>
                        <Badge className="bg-amber-100 text-amber-950 font-black text-[10px]">
                          {dist.heartsAbv}% ABV
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dist.stillNumber} • Mosto: <strong>{dist.washVolumeInput} L</strong> • {new Date(dist.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo Coração</span>
                      <span className="text-base font-black text-amber-900">
                        R$ {dist.costPerLiterHeart.toFixed(2)}/L
                      </span>
                    </div>
                  </div>

                  {/* Cut Fractioning Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Fracionamento do Alambique:</span>
                      <span className="text-emerald-700">
                        Coração Nobre: {dist.heartsLiters} L ({dist.heartsPercentage.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex p-0.5">
                      {/* Heads */}
                      <div
                        title={`Cabeça: ${dist.headsLiters}L (${dist.headsPercentage.toFixed(1)}%)`}
                        style={{ width: `${dist.headsPercentage}%` }}
                        className="bg-rose-500 rounded-l-full"
                      />
                      {/* Hearts */}
                      <div
                        title={`Coração: ${dist.heartsLiters}L (${dist.heartsPercentage.toFixed(1)}%)`}
                        style={{ width: `${dist.heartsPercentage}%` }}
                        className="bg-amber-500"
                      />
                      {/* Tails */}
                      <div
                        title={`Cauda: ${dist.tailsLiters}L (${dist.tailsPercentage.toFixed(1)}%)`}
                        style={{ width: `${dist.tailsPercentage}%` }}
                        className="bg-slate-400 rounded-r-full"
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-1">
                      <span className="flex items-center gap-1 text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Cabeça: {dist.headsLiters}L (Descarte)
                      </span>
                      <span className="flex items-center gap-1 text-amber-900 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        Coração: {dist.heartsLiters}L ({dist.heartsAbv}%)
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        Cauda: {dist.tailsLiters}L ({dist.tailsAbv}%)
                      </span>
                    </div>
                  </div>
                </div>

                {destBarrel && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-2xl">
                    <span className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Wine className="w-3.5 h-3.5 text-amber-700" />
                      Descarregado em: {destBarrel.code} ({WOOD_PROFILES[destBarrel.woodType]?.name})
                    </span>
                    <span className="text-[11px] text-slate-400">Saldo: {destBarrel.currentLiters}L</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* RECORD DISTILLATION MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" />
              Registrar Alambicada & Fracionamento de Cortes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registre a entrada de mosto fermentado e o fracionamento rigoroso de Cabeça, Coração e Cauda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecord} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote da Alambicada *</Label>
                <Input
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Identificação do Alambique</Label>
                <Input
                  required
                  value={stillNumber}
                  onChange={(e) => setStillNumber(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Litros de Mosto Fermentado Inseridos (Wash) *</Label>
              <Input
                type="number"
                required
                value={washVolumeInput}
                onChange={(e) => setWashVolumeInput(e.target.value)}
                className="rounded-xl text-sm font-black text-slate-900"
              />
            </div>

            {/* Fracionamento dos 3 Cortes */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-600" /> Fracionamento dos Cortes de Destilação:
              </span>

              <div className="grid grid-cols-3 gap-3">
                {/* Cabeça */}
                <div className="p-3 rounded-xl bg-white border border-rose-200 space-y-1.5">
                  <span className="text-[11px] font-black text-rose-700 block">1. Cabeça (Descarte)</span>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={headsLiters}
                    onChange={(e) => setHeadsLiters(e.target.value)}
                    placeholder="Litros"
                    className="h-8 text-xs font-bold"
                  />
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>% ABV:</span>
                    <input
                      value={headsAbv}
                      onChange={(e) => setHeadsAbv(e.target.value)}
                      className="w-10 border rounded px-1 text-[10px]"
                    />
                  </div>
                </div>

                {/* Coração */}
                <div className="p-3 rounded-xl bg-amber-100/60 border-2 border-amber-400 space-y-1.5">
                  <span className="text-[11px] font-black text-amber-950 block">2. Coração (Nobre)</span>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={heartsLiters}
                    onChange={(e) => setHeartsLiters(e.target.value)}
                    placeholder="Litros"
                    className="h-8 text-xs font-black text-amber-950 bg-white"
                  />
                  <div className="flex items-center gap-1 text-[10px] text-amber-900 font-bold">
                    <span>% ABV:</span>
                    <input
                      value={heartsAbv}
                      onChange={(e) => setHeartsAbv(e.target.value)}
                      className="w-10 border rounded px-1 text-[10px] bg-white"
                    />
                  </div>
                </div>

                {/* Cauda */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black text-slate-700 block">3. Cauda (Água Fraca)</span>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={tailsLiters}
                    onChange={(e) => setTailsLiters(e.target.value)}
                    placeholder="Litros"
                    className="h-8 text-xs font-bold"
                  />
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>% ABV:</span>
                    <input
                      value={tailsAbv}
                      onChange={(e) => setTailsAbv(e.target.value)}
                      className="w-10 border rounded px-1 text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Cost of the Run */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Custo Total da Alambicada (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={totalRunCost}
                  onChange={(e) => setTotalRunCost(e.target.value)}
                  placeholder="Mosto + Lenha + Operador"
                  className="rounded-xl text-base font-black text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-800">Custo Resultante do Coração</Label>
                <div className="h-10 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-950">
                  <span>R$ {costPerLiterHeartPreview.toFixed(2)} / Litro</span>
                  <span className="text-[10px] text-emerald-700 font-normal">({heartsPercent.toFixed(1)}% do mosto)</span>
                </div>
              </div>
            </div>

            {/* Destination Barrel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Descarregar Coração no Barril / Dorna</Label>
              <select
                value={destinationBarrelId}
                onChange={(e) => setDestinationBarrelId(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-amber-600"
              >
                <option value="none">Apenas registrar (sem descarregar em barril)</option>
                {barrels.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} • {WOOD_PROFILES[b.woodType]?.name} ({b.currentLiters}L / {b.capacityLiters}L)
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl py-5 cursor-pointer text-sm shadow-md"
              >
                {loading ? "Processando..." : "Salvar Alambicada & Abastecer Barril"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
