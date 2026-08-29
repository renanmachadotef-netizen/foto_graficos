"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Wine,
  GlassWater,
  Layers,
  Percent,
  DollarSign,
  Droplet,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Citrus,
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
import { createBlendBatchAction, createLiquorBatchAction } from "./actions";
import { WOOD_PROFILES } from "@/app/barrels/BarrelsClientView";

interface BlendsClientViewProps {
  barrels: any[];
  blendBatches: any[];
  liquorBatches: any[];
  tenantConfig: TenantConfig;
}

export function BlendsClientView({
  barrels,
  blendBatches,
  liquorBatches,
  tenantConfig,
}: BlendsClientViewProps) {
  const [activeTab, setActiveTab] = useState<"BLENDS" | "LIQUORS">("BLENDS");

  // Blend Modal State
  const [isBlendOpen, setIsBlendOpen] = useState(false);
  const [blendName, setBlendName] = useState("Blend 3 Madeiras Safra Ouro");
  const [blendBatchNumber, setBlendBatchNumber] = useState(`BLEND-${new Date().getFullYear()}/01`);
  const [blendDestinationBarrelId, setBlendDestinationBarrelId] = useState("none");
  const [blendNotes, setBlendNotes] = useState("");
  const [blendItems, setBlendItems] = useState<{ barrelId: string; litersUsed: string }[]>([
    { barrelId: barrels.length > 0 ? barrels[0].id : "", litersUsed: "50" },
    { barrelId: barrels.length > 1 ? barrels[1].id : "", litersUsed: "30" },
  ]);

  // Liquor Modal State
  const [isLiquorOpen, setIsLiquorOpen] = useState(false);
  const [liquorName, setLiquorName] = useState("Licor Fino de Banana c/ Canela e Amburana");
  const [liquorFlavor, setLiquorFlavor] = useState("BANANA");
  const [liquorBatchNumber, setLiquorBatchNumber] = useState(`LICOR-${new Date().getFullYear()}/01`);
  const [baseSpiritLiters, setBaseSpiritLiters] = useState("20");
  const [baseSpiritCostPerLiter, setBaseSpiritCostPerLiter] = useState("12.00");
  const [ingredientsCost, setIngredientsCost] = useState("180.00");
  const [macerationDays, setMacerationDays] = useState("30");
  const [finalVolumeLiters, setFinalVolumeLiters] = useState("35");
  const [finalAbv, setFinalAbv] = useState("22.0");
  const [liquorNotes, setLiquorNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // Live calculation of Blend Weighted Average Cost & ABV
  const blendCalculations = useMemo(() => {
    let totalLiters = 0;
    let totalValue = 0;
    let totalAbv = 0;

    blendItems.forEach((item) => {
      const b = barrels.find((x) => x.id === item.barrelId);
      const l = parseFloat(item.litersUsed) || 0;
      if (b && l > 0) {
        totalLiters += l;
        totalValue += l * b.costPerLiter;
        totalAbv += l * b.abvPercentage;
      }
    });

    const averageCost = totalLiters > 0 ? totalValue / totalLiters : 0;
    const finalAbv = totalLiters > 0 ? totalAbv / totalLiters : 42.0;

    return { totalLiters, averageCost, finalAbv };
  }, [blendItems, barrels]);

  const handleAddBlendItem = () => {
    if (barrels.length === 0) return;
    setBlendItems([...blendItems, { barrelId: barrels[0].id, litersUsed: "20" }]);
  };

  const handleRemoveBlendItem = (index: number) => {
    setBlendItems(blendItems.filter((_, i) => i !== index));
  };

  const handleBlendItemChange = (index: number, field: "barrelId" | "litersUsed", value: string) => {
    const next = [...blendItems];
    next[index][field] = value;
    setBlendItems(next);
  };

  const handleCreateBlend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBlendBatchAction({
        name: blendName,
        batchNumber: blendBatchNumber,
        items: blendItems.map((bi) => ({
          barrelId: bi.barrelId,
          litersUsed: parseFloat(bi.litersUsed) || 0,
        })),
        destinationBarrelId: blendDestinationBarrelId,
        notes: blendNotes,
      });

      setIsBlendOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert("Erro ao criar blend: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLiquor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createLiquorBatchAction({
        name: liquorName,
        flavor: liquorFlavor,
        batchNumber: liquorBatchNumber,
        baseSpiritLiters: parseFloat(baseSpiritLiters) || 0,
        baseSpiritCostPerLiter: parseFloat(baseSpiritCostPerLiter) || 0,
        ingredientsCost: parseFloat(ingredientsCost) || 0,
        macerationDays: parseInt(macerationDays, 10) || 30,
        finalVolumeLiters: parseFloat(finalVolumeLiters) || 0,
        finalAbv: parseFloat(finalAbv) || 22,
        notes: liquorNotes,
      });

      setIsLiquorOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert("Erro ao criar licor: " + e.message);
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
            <Sparkles className="w-4 h-4 text-amber-300" />
            Blends de Madeiras & Licores Finos
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Blends Nobres & Licores Artesanais
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Crie lotes harmonizados de blends retirando frações de múltiplos barris com cálculo de Custo Médio Ponderado, ou produza licores finos de frutas com maceração.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsBlendOpen(true)}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-950/40 rounded-2xl gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <Sparkles className="w-5 h-5 text-amber-950" />
            Criar Lote de Blend
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsLiquorOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-amber-300/40 backdrop-blur-md rounded-2xl font-bold gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <GlassWater className="w-4 h-4 text-amber-300" />
            Produzir Licor Fino
          </Button>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🍸
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("BLENDS")}
          className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "BLENDS"
              ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Blends de Madeiras ({blendBatches.length})
        </button>

        <button
          onClick={() => setActiveTab("LIQUORS")}
          className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "LIQUORS"
              ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <GlassWater className="w-4 h-4 text-amber-400" />
          Licores Finos ({liquorBatches.length})
        </button>
      </div>

      {/* TAB 1: BLENDS */}
      {activeTab === "BLENDS" && (
        <div className="space-y-4">
          {blendBatches.length === 0 && (
            <Card className="p-10 text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/40">
              <Sparkles className="w-10 h-10 text-amber-600/60 mx-auto mb-2" />
              <h3 className="text-base font-black text-amber-950">Nenhum lote de blend criado ainda</h3>
              <p className="text-xs text-amber-800/80 mt-1">
                Combine volumes de Amburana, Carvalho e Bálsamo para criar o seu primeiro blend exclusivo.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {blendBatches.map((blend) => (
              <Card key={blend.id} className="rounded-3xl border-amber-200/80 p-5 bg-white shadow-xs hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">{blend.name}</h3>
                      <Badge className="bg-amber-100 text-amber-950 font-black text-[10px]">
                        {blend.finalAbv.toFixed(1)}% ABV
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lote: <strong>{blend.batchNumber}</strong> • {new Date(blend.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo Médio Ponderado</span>
                    <span className="text-lg font-black text-amber-900 font-mono">
                      R$ {blend.averageCostPerLiter.toFixed(2)}/L
                    </span>
                  </div>
                </div>

                {/* Composition Breakdown */}
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-bold text-slate-700">Composição de Barris do Blend ({blend.totalLiters} L total):</span>
                  <div className="space-y-1.5 pt-1">
                    {blend.items?.map((item: any) => {
                      const percent = blend.totalLiters > 0 ? (item.litersUsed / blend.totalLiters) * 100 : 0;
                      const wood = WOOD_PROFILES[item.woodType] || WOOD_PROFILES.AMBURANA;

                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <span>{wood.icon}</span> {item.barrel?.code || "Barril"} ({wood.name}): <strong>{item.litersUsed} L</strong> ({percent.toFixed(0)}%)
                          </span>
                          <span className="text-slate-500 font-medium">R$ {item.costPerLiter.toFixed(2)}/L</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIQUORS */}
      {activeTab === "LIQUORS" && (
        <div className="space-y-4">
          {liquorBatches.length === 0 && (
            <Card className="p-10 text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/40">
              <GlassWater className="w-10 h-10 text-amber-600/60 mx-auto mb-2" />
              <h3 className="text-base font-black text-amber-950">Nenhum licor produzido ainda</h3>
              <p className="text-xs text-amber-800/80 mt-1">
                Cadastre licores de banana, maracujá, café ou canela com controle de insumos e custo por litro.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liquorBatches.map((liq) => (
              <Card key={liq.id} className="rounded-3xl border-amber-200/80 p-5 bg-white shadow-xs hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">{liq.name}</h3>
                      <Badge className="bg-amber-100 text-amber-950 font-black text-[10px]">
                        {liq.finalAbv}% ABV
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lote: <strong>{liq.batchNumber}</strong> • Maceração: <strong>{liq.macerationDays} dias</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo por Litro</span>
                    <span className="text-lg font-black text-amber-900 font-mono">
                      R$ {liq.costPerLiter.toFixed(2)}/L
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-2 text-xs">
                  <div className="bg-amber-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Cachaça Base</span>
                    <span className="font-black text-slate-900">{liq.baseSpiritLiters} L</span>
                  </div>
                  <div className="bg-amber-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Insumos/Fruta</span>
                    <span className="font-black text-slate-900">R$ {liq.ingredientsCost.toFixed(2)}</span>
                  </div>
                  <div className="bg-amber-50/60 p-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Rendimento</span>
                    <span className="font-black text-amber-950">{liq.finalVolumeLiters} L</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CREATE BLEND MODAL */}
      <Dialog open={isBlendOpen} onOpenChange={setIsBlendOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Criar Novo Lote de Blend de Madeiras
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione múltiplos barris e a quantidade retirada de cada um. O custo por litro será ponderado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBlend} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nome do Blend *</Label>
                <Input
                  required
                  value={blendName}
                  onChange={(e) => setBlendName(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote</Label>
                <Input
                  required
                  value={blendBatchNumber}
                  onChange={(e) => setBlendBatchNumber(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* Barrel Items */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Wine className="w-4 h-4 text-amber-600" /> Barris de Origem:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddBlendItem}
                  className="border-amber-300 text-amber-950 text-xs rounded-xl font-bold gap-1 bg-white"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Barril
                </Button>
              </div>

              {blendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 pt-1">
                  <select
                    value={item.barrelId}
                    onChange={(e) => handleBlendItemChange(idx, "barrelId", e.target.value)}
                    className="w-2/3 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                  >
                    {barrels.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} • {WOOD_PROFILES[b.woodType]?.name} (Disponível: {b.currentLiters}L • R$ {b.costPerLiter.toFixed(2)}/L)
                      </option>
                    ))}
                  </select>

                  <div className="w-1/3 relative">
                    <Input
                      type="number"
                      step="0.1"
                      required
                      value={item.litersUsed}
                      onChange={(e) => handleBlendItemChange(idx, "litersUsed", e.target.value)}
                      placeholder="Litros"
                      className="rounded-xl text-xs font-black pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">L</span>
                  </div>

                  {blendItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlendItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Result Summary */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300">Custo Médio Ponderado</span>
                <p className="text-2xl font-black text-white mt-0.5">
                  R$ {blendCalculations.averageCost.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ Litro</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Volume Total do Blend</span>
                <p className="text-lg font-black text-amber-300">
                  {blendCalculations.totalLiters.toFixed(1)} Litros ({blendCalculations.finalAbv.toFixed(1)}% ABV)
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl py-5 cursor-pointer text-sm shadow-md"
              >
                {loading ? "Montando Blend..." : "Salvar Lote de Blend & Abater Barris"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE LIQUOR MODAL */}
      <Dialog open={isLiquorOpen} onOpenChange={setIsLiquorOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <GlassWater className="w-5 h-5 text-amber-600" />
              Produzir Lote de Licor Fino Artesanal
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLiquor} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nome do Licor *</Label>
              <Input
                required
                value={liquorName}
                onChange={(e) => setLiquorName(e.target.value)}
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Sabor / Fruta</Label>
                <select
                  value={liquorFlavor}
                  onChange={(e) => setLiquorFlavor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                >
                  <option value="BANANA">🍌 Banana c/ Canela</option>
                  <option value="MARACUJA">🍈 Maracujá</option>
                  <option value="CAFE">☕ Café Nobre</option>
                  <option value="JABUTICABA">🍇 Jabuticaba</option>
                  <option value="DOCE_DE_LEITE">🥛 Doce de Leite Cremoso</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote</Label>
                <Input
                  required
                  value={liquorBatchNumber}
                  onChange={(e) => setLiquorBatchNumber(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Cachaça Base (Litros)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={baseSpiritLiters}
                  onChange={(e) => setBaseSpiritLiters(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Custo Cachaça (R$/L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={baseSpiritCostPerLiter}
                  onChange={(e) => setBaseSpiritCostPerLiter(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Custo Insumos/Frutas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={ingredientsCost}
                  onChange={(e) => setIngredientsCost(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Volume Final Obtido (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={finalVolumeLiters}
                  onChange={(e) => setFinalVolumeLiters(e.target.value)}
                  className="rounded-xl text-xs font-black text-amber-950"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-amber-800 text-white font-bold rounded-2xl py-5">
                {loading ? "Processando..." : "Salvar Lote de Licor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
