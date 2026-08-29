"use client";

import React, { useState, useMemo } from "react";
import {
  Wine,
  GlassWater,
  Calculator,
  Layers,
  Sparkles,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  ArrowRight,
  Boxes,
  Tag,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantConfig } from "@/lib/tenant";
import { executeBottlingRunAction } from "./actions";
import { WOOD_PROFILES } from "@/app/barrels/BarrelsClientView";

interface Barrel {
  id: string;
  code: string;
  woodType: string;
  currentLiters: number;
  capacityLiters: number;
  abvPercentage: number;
  batchNumber: string;
}

interface Material {
  id: string;
  name: string;
  unitCost: number;
  unit: string;
}

interface BottlingCalculatorClientViewProps {
  barrels: Barrel[];
  packagingMaterials: Material[];
  recentBottlings: any[];
  initialBarrelId?: string;
  tenantConfig: TenantConfig;
}

export function BottlingCalculatorClientView({
  barrels,
  packagingMaterials,
  recentBottlings,
  initialBarrelId,
  tenantConfig,
}: BottlingCalculatorClientViewProps) {
  const [selectedBarrelId, setSelectedBarrelId] = useState<string>(
    initialBarrelId || (barrels.length > 0 ? barrels[0].id : "none")
  );

  // Selected Barrel Object
  const selectedBarrel = useMemo(() => {
    return barrels.find((b) => b.id === selectedBarrelId);
  }, [barrels, selectedBarrelId]);

  // Product Name
  const [productName, setProductName] = useState<string>(
    selectedBarrel
      ? `Cachaça Pura Brasil ${WOOD_PROFILES[selectedBarrel.woodType]?.name || "Amburana"} 750ml`
      : "Cachaça Pura Brasil Amburana Reserva 750ml"
  );

  // Batch Parameters
  const [bottlesQuantity, setBottlesQuantity] = useState<string>("100");
  const [bottleVolumeMl, setBottleVolumeMl] = useState<number>(750);

  // BOM Component Costs
  const [liquidCostPerLiter, setLiquidCostPerLiter] = useState<string>("12.00");
  const [bottleUnitCost, setBottleUnitCost] = useState<string>("8.50");
  const [corkUnitCost, setCorkUnitCost] = useState<string>("3.20");
  const [labelUnitCost, setLabelUnitCost] = useState<string>("2.10");
  const [sealUnitCost, setSealUnitCost] = useState<string>("0.60");
  const [boxUnitCost, setBoxUnitCost] = useState<string>("8.40"); // For 6 bottles -> R$ 1.40/bottle
  const [laborUnitCost, setLaborUnitCost] = useState<string>("2.20");

  // Retail & Wholesale Pricing
  const [retailPrice, setRetailPrice] = useState<string>("79.90");
  const [wholesalePrice, setWholesalePrice] = useState<string>("54.90");

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Auto update product name when barrel changes
  const handleBarrelChange = (barrelId: string) => {
    setSelectedBarrelId(barrelId);
    const b = barrels.find((x) => x.id === barrelId);
    if (b) {
      const woodName = WOOD_PROFILES[b.woodType]?.name || "Artesanal";
      setProductName(`Cachaça Pura Brasil ${woodName} ${bottleVolumeMl}ml`);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setBottleVolumeMl(vol);
    const woodName = selectedBarrel ? WOOD_PROFILES[selectedBarrel.woodType]?.name || "Artesanal" : "Amburana";
    setProductName(`Cachaça Pura Brasil ${woodName} ${vol}ml`);

    // Adjust bottle glass cost proportionally
    if (vol === 500) setBottleUnitCost("6.80");
    else if (vol === 160) setBottleUnitCost("3.90");
    else setBottleUnitCost("8.50");
  };

  // Calculations
  const qty = Math.max(1, parseInt(bottlesQuantity, 10) || 1);
  const totalLitersNeeded = (qty * bottleVolumeMl) / 1000;
  const boxesNeeded = Math.ceil(qty / 6);

  const numLiquidCostPerLiter = parseFloat(liquidCostPerLiter) || 0;
  const numBottleCost = parseFloat(bottleUnitCost) || 0;
  const numCorkCost = parseFloat(corkUnitCost) || 0;
  const numLabelCost = parseFloat(labelUnitCost) || 0;
  const numSealCost = parseFloat(sealUnitCost) || 0;
  const numBoxCostPerBottle = (parseFloat(boxUnitCost) || 0) / 6;
  const numLaborCost = parseFloat(laborUnitCost) || 0;

  const liquidCostPerBottle = (bottleVolumeMl / 1000) * numLiquidCostPerLiter;
  const dryGoodsCostPerBottle = numBottleCost + numCorkCost + numLabelCost + numSealCost + numBoxCostPerBottle;
  const totalCogsPerBottle = liquidCostPerBottle + dryGoodsCostPerBottle + numLaborCost;

  const totalBatchCost = totalCogsPerBottle * qty;

  // Margin Analysis
  const numRetailPrice = parseFloat(retailPrice) || 0;
  const retailProfitPerBottle = numRetailPrice - totalCogsPerBottle;
  const retailMarginPercent = numRetailPrice > 0 ? (retailProfitPerBottle / numRetailPrice) * 100 : 0;
  const totalRetailRevenue = numRetailPrice * qty;
  const totalRetailProfit = retailProfitPerBottle * qty;

  const numWholesalePrice = parseFloat(wholesalePrice) || 0;
  const wholesaleProfitPerBottle = numWholesalePrice - totalCogsPerBottle;
  const wholesaleMarginPercent = numWholesalePrice > 0 ? (wholesaleProfitPerBottle / numWholesalePrice) * 100 : 0;
  const totalWholesaleRevenue = numWholesalePrice * qty;
  const totalWholesaleProfit = wholesaleProfitPerBottle * qty;

  const handleExecuteBottling = async () => {
    setLoading(true);
    try {
      const res = await executeBottlingRunAction({
        barrelId: selectedBarrelId,
        productName,
        woodType: selectedBarrel ? WOOD_PROFILES[selectedBarrel.woodType]?.name || "Artesanal" : "Madeira Nobre",
        bottlesQuantity: qty,
        bottleVolumeMl,
        liquidCostPerLiter: numLiquidCostPerLiter,
        bottleUnitCost: numBottleCost,
        corkUnitCost: numCorkCost,
        labelUnitCost: numLabelCost,
        sealUnitCost: numSealCost,
        boxUnitCost: parseFloat(boxUnitCost) || 0,
        laborUnitCost: numLaborCost,
        retailPrice: numRetailPrice,
        wholesalePrice: numWholesalePrice,
      });

      setSuccessResult(res);
    } catch (e: any) {
      alert("Erro ao executar envase: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Lovable Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <Calculator className="w-4 h-4 text-amber-300" />
            Ficha Técnica & Simulador de Margem
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Envase & Custo por Garrafa (BOM)
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Calcule o custo exato de cada garrafa (líquido + vidro + rolha + rótulo + lacre + caixa) e defina os preços de atacado e balcão com alta lucratividade.
          </p>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🍾
        </div>
      </div>

      {/* Success Modal Notification */}
      {successResult && (
        <Card className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-emerald-950 text-lg">
                  Lote de Envase Realizado com Sucesso! 🎉
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <strong>{successResult.totalBottles} garrafas</strong> adicionadas ao estoque com Custo Unitário de{" "}
                  <strong>R$ {successResult.cogsPerBottle.toFixed(2)}</strong>. O volume de{" "}
                  <strong>{successResult.totalLitersUsed.toFixed(1)}L</strong> foi abatido do barril.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href="/pdv">
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl gap-1.5 cursor-pointer">
                  <ShoppingBag className="w-4 h-4" />
                  Ver no PDV Balcão
                </Button>
              </a>
              <Button
                variant="outline"
                onClick={() => setSuccessResult(null)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs rounded-xl"
              >
                Fechar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: BOM Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Origin Barrel & Format */}
          <Card className="rounded-3xl border-amber-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-amber-100 bg-amber-50/40">
              <CardTitle className="text-base font-black text-amber-950 flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-600" />
                1. Barril de Origem & Formato da Garrafa
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Barrel Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Selecione o Barril / Tonel de Origem</Label>
                <select
                  value={selectedBarrelId}
                  onChange={(e) => handleBarrelChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-amber-600"
                >
                  <option value="none">Destilado Avulso / Tanque Inox Genérico</option>
                  {barrels.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} • {WOOD_PROFILES[b.woodType]?.name || b.woodType} ({b.currentLiters}L disponíveis • {b.abvPercentage}% ABV)
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nome Comercial do Rótulo</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-semibold"
                />
              </div>

              {/* Volume Format Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tamanho da Garrafa</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { ml: 750, label: "750ml (Padrão)", icon: "🍾" },
                    { ml: 500, label: "500ml (Médio)", icon: "🍷" },
                    { ml: 160, label: "160ml (Degustação)", icon: "🥃" },
                  ].map((item) => (
                    <button
                      key={item.ml}
                      type="button"
                      onClick={() => handleVolumeChange(item.ml)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        bottleVolumeMl === item.ml
                          ? "bg-amber-900 text-white border-amber-900 shadow-md shadow-amber-900/20 font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-base block mb-0.5">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Qtd. de Garrafas a Envasar</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bottlesQuantity}
                    onChange={(e) => setBottlesQuantity(e.target.value)}
                    className="rounded-xl border-slate-200 font-black text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Volume Total Necessário</Label>
                  <div className="h-10 px-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>{totalLitersNeeded.toFixed(1)} Litros</span>
                    <span className="text-[10px] text-amber-700 font-normal">({boxesNeeded} caixas)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Bill of Materials (BOM) Costs */}
          <Card className="rounded-3xl border-amber-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-amber-100 bg-amber-50/40">
              <CardTitle className="text-base font-black text-amber-950 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                2. Composição de Insumos da Garrafa (BOM)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Custo do Líquido (R$ / Litro)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={liquidCostPerLiter}
                      onChange={(e) => setLiquidCostPerLiter(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    = R$ {liquidCostPerBottle.toFixed(2)} por garrafa ({bottleVolumeMl}ml)
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Garrafa de Vidro Paris (R$/un)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={bottleUnitCost}
                      onChange={(e) => setBottleUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Rolha de Cortiça c/ Madeira (R$/un)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={corkUnitCost}
                      onChange={(e) => setCorkUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Rótulo + Contra-rótulo (R$/par)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={labelUnitCost}
                      onChange={(e) => setLabelUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Lacre Termoencolhível (R$/un)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={sealUnitCost}
                      onChange={(e) => setSealUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Caixa de Papelão 6un (R$/cx)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={boxUnitCost}
                      onChange={(e) => setBoxUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    = R$ {numBoxCostPerBottle.toFixed(2)} por garrafa
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Mão de Obra, Enchimento & Rotulagem (R$/un)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={laborUnitCost}
                      onChange={(e) => setLaborUnitCost(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing, Margins & Execution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Cost & Pricing Summary */}
          <Card className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-md overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-amber-200/80 bg-amber-100/50">
              <CardTitle className="text-base font-black text-amber-950 flex items-center justify-between">
                <span>Resumo de Custos & Margem</span>
                <Badge className="bg-amber-800 text-white font-black text-xs">
                  {qty} Garrafas
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Giant Cost per Bottle */}
              <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Custo Total por Garrafa (COGS)</span>
                  <p className="text-3xl font-black text-slate-900 mt-0.5">
                    R$ {totalCogsPerBottle.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Custo Total do Lote</span>
                  <p className="text-base font-bold text-amber-900">
                    R$ {totalBatchCost.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Mini Cost Breakdown Bar */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600">Composição do Custo Unitário:</span>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    title="Líquido"
                    style={{ width: `${(liquidCostPerBottle / totalCogsPerBottle) * 100}%` }}
                    className="bg-amber-600"
                  />
                  <div
                    title="Vidro Paris"
                    style={{ width: `${(numBottleCost / totalCogsPerBottle) * 100}%` }}
                    className="bg-emerald-600"
                  />
                  <div
                    title="Rolha/Rótulo/Lacre"
                    style={{ width: `${((numCorkCost + numLabelCost + numSealCost) / totalCogsPerBottle) * 100}%` }}
                    className="bg-purple-600"
                  />
                  <div
                    title="Caixa & Mão de Obra"
                    style={{ width: `${((numBoxCostPerBottle + numLaborCost) / totalCogsPerBottle) * 100}%` }}
                    className="bg-slate-400"
                  />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Cachaça R$ {liquidCostPerBottle.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Vidro R$ {numBottleCost.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Acabamentos R$ {(numCorkCost + numLabelCost + numSealCost).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pricing Inputs */}
              <div className="space-y-4 pt-2 border-t border-amber-200/60">
                {/* Retail Price (Balcão / Alambique) */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-700" /> Preço Balcão / Varejo (PDV)
                    </Label>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Margem: {retailMarginPercent.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">R$</span>
                    <Input
                      type="number"
                      step="0.10"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      className="pl-9 h-10 text-base font-black bg-white rounded-xl border-amber-300 text-slate-900"
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-emerald-800 font-semibold pt-1">
                    <span>Lucro Líquido: <strong>R$ {retailProfitPerBottle.toFixed(2)} / garrafa</strong></span>
                    <span>Lote Total: <strong>R$ {totalRetailProfit.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* Wholesale Price (Bares, Empórios, Restaurantes) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-slate-600" /> Preço Atacado (Empórios / Caixas)
                    </Label>
                    <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Margem: {wholesaleMarginPercent.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">R$</span>
                    <Input
                      type="number"
                      step="0.10"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      className="pl-9 h-10 text-base font-black bg-white rounded-xl border-slate-300 text-slate-900"
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-blue-800 font-semibold pt-1">
                    <span>Lucro Líquido: <strong>R$ {wholesaleProfitPerBottle.toFixed(2)} / garrafa</strong></span>
                    <span>Lote Total: <strong>R$ {totalWholesaleProfit.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Big Action Button */}
              <Button
                size="lg"
                onClick={handleExecuteBottling}
                disabled={loading}
                className="w-full py-6 text-base font-black bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-800 hover:from-amber-600 hover:to-yellow-700 text-white shadow-xl shadow-amber-900/30 rounded-2xl gap-2 cursor-pointer"
              >
                <PackageCheck className="w-5 h-5" />
                {loading ? "Processando Envase..." : `Envasar Lote de ${qty} Garrafas`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
