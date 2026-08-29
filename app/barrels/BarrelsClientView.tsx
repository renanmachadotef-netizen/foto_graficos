"use client";

import React, { useState, useMemo } from "react";
import {
  Wine,
  Plus,
  Flame,
  Sparkles,
  Calendar,
  Layers,
  Search,
  Droplet,
  Compass,
  ArrowRight,
  Clock,
  Award,
  CheckCircle2,
  Trash2,
  Edit,
  Activity,
  GlassWater,
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
import { createBarrelAction, deleteBarrelAction, updateBarrelAction } from "./actions";
import Link from "next/link";

export interface BarrelItem {
  id: string;
  code: string;
  woodType: string;
  capacityLiters: number;
  currentLiters: number;
  abvPercentage: number;
  fillDate: Date | string;
  batchNumber: string;
  status: string;
  sensoryNotes?: string | null;
  location?: string | null;
}

interface BarrelsClientViewProps {
  initialBarrels: BarrelItem[];
  bottlingRuns: any[];
  tenantConfig: TenantConfig;
  userRole: string;
}

export const WOOD_PROFILES: Record<
  string,
  { name: string; tag: string; bg: string; border: string; text: string; notes: string; icon: string }
> = {
  CARVALHO_FRANCES: {
    name: "Carvalho Francês",
    tag: "Madeira Nobre Européia",
    bg: "bg-amber-950/10",
    border: "border-amber-700/40",
    text: "text-amber-900",
    notes: "Aromas sutis de baunilha, amêndoas tostadas e taninos aveludados.",
    icon: "🪵",
  },
  AMBURANA: {
    name: "Amburana (Cerejeira)",
    tag: "Madeira Autóctone Brasileira",
    bg: "bg-orange-950/10",
    border: "border-orange-600/40",
    text: "text-orange-950",
    notes: "Notas intensas de canela, mel, especiarias e bouquet adocicado marcante.",
    icon: "🌸",
  },
  BALSAMO: {
    name: "Bálsamo (Cabriúva)",
    tag: "Resina & Herbal",
    bg: "bg-emerald-950/10",
    border: "border-emerald-700/40",
    text: "text-emerald-950",
    notes: "Aroma herbal marcante, notas de anis, cravo e toque amadeirado persistente.",
    icon: "🌿",
  },
  JEQUITIBA: {
    name: "Jequitibá Rosa",
    tag: "Maciez Neutra",
    bg: "bg-rose-950/10",
    border: "border-rose-600/40",
    text: "text-rose-950",
    notes: "Reduz a acidez e traz maciez excepcional sem alterar a cor natural da cachaça.",
    icon: "🌺",
  },
  CARVALHO_AMERICANO: {
    name: "Carvalho Americano",
    tag: "Tostagem Intensa",
    bg: "bg-yellow-950/10",
    border: "border-yellow-700/40",
    text: "text-yellow-950",
    notes: "Notas clássicas de coco queimado, caramelo toffee e baunilha persistente.",
    icon: "🇺🇸",
  },
  INOX: {
    name: "Dorna de Inox (Prata)",
    tag: "Descanso & Oxigenação",
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-900",
    notes: "Cachaça Prata clássica, repousada para harmonização aromática sem contato com madeira.",
    icon: "🛡️",
  },
};

export function BarrelsClientView({
  initialBarrels,
  bottlingRuns,
  tenantConfig,
  userRole,
}: BarrelsClientViewProps) {
  const [barrels, setBarrels] = useState<BarrelItem[]>(initialBarrels);
  const [selectedWoodFilter, setSelectedWoodFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Barrel Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [woodType, setWoodType] = useState("AMBURANA");
  const [capacityLiters, setCapacityLiters] = useState("200");
  const [currentLiters, setCurrentLiters] = useState("200");
  const [abvPercentage, setAbvPercentage] = useState("42.0");
  const [fillDate, setFillDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchNumber, setBatchNumber] = useState("LOTE-2026/01");
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [location, setLocation] = useState("Adega Principal - Fileira A");
  const [loading, setLoading] = useState(false);

  // Metrics
  const totalLiters = useMemo(() => {
    return barrels.reduce((acc, b) => acc + b.currentLiters, 0);
  }, [barrels]);

  const totalCapacity = useMemo(() => {
    return barrels.reduce((acc, b) => acc + b.capacityLiters, 0);
  }, [barrels]);

  const agingBarrelsCount = useMemo(() => {
    return barrels.filter((b) => b.status === "AGING").length;
  }, [barrels]);

  const readyBarrelsCount = useMemo(() => {
    return barrels.filter((b) => b.status === "READY" || b.status === "BOTTLING").length;
  }, [barrels]);

  // Estimated Potential Bottles (750ml)
  const potentialBottles = useMemo(() => {
    return Math.floor(totalLiters / 0.75);
  }, [totalLiters]);

  // Filtered Barrels
  const filteredBarrels = useMemo(() => {
    return barrels.filter((b) => {
      const matchWood = selectedWoodFilter === "ALL" || b.woodType === selectedWoodFilter;
      const matchSearch =
        !searchQuery ||
        b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.sensoryNotes && b.sensoryNotes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchWood && matchSearch;
    });
  }, [barrels, selectedWoodFilter, searchQuery]);

  const handleCreateBarrel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBarrelAction({
        code,
        woodType,
        capacityLiters: parseFloat(capacityLiters) || 200,
        currentLiters: parseFloat(currentLiters) || 200,
        abvPercentage: parseFloat(abvPercentage) || 42,
        fillDate,
        batchNumber,
        sensoryNotes,
        location,
      });

      setIsCreateOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const calculateAgingTime = (fillDate: Date | string) => {
    try {
      const start = new Date(fillDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) return `${diffDays} dias`;
      const months = Math.floor(diffDays / 30);
      if (months < 12) return `${months} meses`;
      const years = (diffDays / 365).toFixed(1);
      return `${years} anos (${months} meses)`;
    } catch {
      return "Recém abastecido";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Lovable Banner - Adega de Maturação */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <Wine className="w-4 h-4 text-amber-300" />
            Galpão de Tonéis & Envelhecimento
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Adega de Barris • Pura Brasil
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Acompanhe o tempo de maturação das madeiras nobres brasileiras, volume útil nos tonéis, teor alcoólico e simule o envase de garrafas com controle exato de custos.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link href="/bottling">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-xl shadow-amber-950/40 rounded-2xl gap-2 cursor-pointer text-sm"
            >
              <GlassWater className="w-5 h-5" />
              Simular / Executar Envase
            </Button>
          </Link>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsCreateOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-amber-300/40 backdrop-blur-md rounded-2xl font-bold gap-2 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5 text-amber-300" />
            Novo Barril / Dorna
          </Button>
        </div>

        {/* Subtle Watermark */}
        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🥃
        </div>
      </div>

      {/* KPI Cards in Lovable Palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Volume em Barris</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalLiters.toLocaleString("pt-BR")} <span className="text-sm font-semibold text-slate-500">Litros</span>
            </p>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Capacidade total: {totalCapacity.toLocaleString("pt-BR")} L
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Potencial de Envase</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Wine className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              ~{potentialBottles.toLocaleString("pt-BR")} <span className="text-sm font-semibold text-slate-500">Garrafas</span>
            </p>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Equivalente a {(potentialBottles / 6).toFixed(0)} caixas fechadas
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Barris em Maturação</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {agingBarrelsCount} <span className="text-sm font-semibold text-slate-500">Tonéis</span>
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              {readyBarrelsCount} prontos para engarrafar
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Madeiras em Estoque</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {Object.keys(WOOD_PROFILES).length} <span className="text-sm font-semibold text-slate-500">Perfis</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Carvalho, Amburana, Bálsamo e mais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs by Wood Type */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWoodFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedWoodFilter === "ALL"
                ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos os Barris ({barrels.length})
          </button>

          {Object.entries(WOOD_PROFILES).map(([key, prof]) => {
            const count = barrels.filter((b) => b.woodType === key).length;
            const isSelected = selectedWoodFilter === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedWoodFilter(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{prof.icon}</span>
                <span>{prof.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por código, lote ou aroma..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Barrels Grid in Lovable Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBarrels.map((barrel) => {
          const woodInfo = WOOD_PROFILES[barrel.woodType] || WOOD_PROFILES.CARVALHO_FRANCES;
          const fillPercentage = Math.min(100, Math.round((barrel.currentLiters / barrel.capacityLiters) * 100));
          const agingTime = calculateAgingTime(barrel.fillDate);

          return (
            <Card
              key={barrel.id}
              className="rounded-3xl border-amber-200/80 bg-white/95 shadow-sm hover:shadow-xl hover:border-amber-400/80 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Header with Wood Header Bar */}
                <div className="p-5 pb-4 border-b border-amber-100/80 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-950 flex items-center justify-center text-2xl text-white shadow-md shadow-amber-900/20 shrink-0">
                      {woodInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-lg leading-tight">{barrel.code}</h3>
                        <Badge
                          className={`text-[10px] font-black uppercase ${
                            barrel.status === "READY"
                              ? "bg-emerald-600 text-white"
                              : barrel.status === "BOTTLING"
                              ? "bg-indigo-600 text-white"
                              : barrel.status === "EMPTY"
                              ? "bg-slate-400 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {barrel.status === "AGING"
                            ? "Maturando"
                            : barrel.status === "READY"
                            ? "Pronto"
                            : barrel.status === "BOTTLING"
                            ? "Em Envase"
                            : "Vazio"}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-amber-900 mt-0.5">{woodInfo.name}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {barrel.batchNumber}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  {/* Gauge & Liters Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-amber-600" />
                        Volume Atual
                      </span>
                      <span className="font-black text-slate-900">
                        {barrel.currentLiters} L <span className="text-slate-400 font-normal">/ {barrel.capacityLiters} L</span>
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-amber-100 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-500"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* 3 Metric Pills */}
                  <div className="grid grid-cols-3 gap-2 py-2">
                    <div className="bg-amber-50/60 p-2.5 rounded-xl text-center border border-amber-100/60">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Teor ABV</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{barrel.abvPercentage}%</p>
                    </div>

                    <div className="bg-amber-50/60 p-2.5 rounded-xl text-center border border-amber-100/60">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Envelhecido</p>
                      <p className="text-xs font-black text-slate-900 mt-1 truncate">{agingTime}</p>
                    </div>

                    <div className="bg-amber-50/60 p-2.5 rounded-xl text-center border border-amber-100/60">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Garrafas (750ml)</p>
                      <p className="text-sm font-black text-amber-900 mt-0.5">
                        ~{Math.floor(barrel.currentLiters / 0.75)}
                      </p>
                    </div>
                  </div>

                  {/* Sensory Notes */}
                  {barrel.sensoryNotes && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                      <span className="font-bold text-amber-950 flex items-center gap-1 mb-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Notas de Degustação:
                      </span>
                      <p className="italic">{barrel.sensoryNotes}</p>
                    </div>
                  )}

                  {barrel.location && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      Localização: <strong>{barrel.location}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link href={`/bottling?barrelId=${barrel.id}`} className="w-full">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs cursor-pointer"
                  >
                    <GlassWater className="w-3.5 h-3.5" />
                    Envasar Garrafas
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE BARREL DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Wine className="w-5 h-5 text-amber-600" />
              Cadastrar Novo Barril / Dorna
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione um tonel ao mapa da adega com a madeira e volume inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBarrel} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código / Identificação *</Label>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: BARRIL-07, TON-02"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Madeira *</Label>
                <select
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-amber-600"
                >
                  {Object.entries(WOOD_PROFILES).map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Capacidade (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={capacityLiters}
                  onChange={(e) => setCapacityLiters(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Volume Atual (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={currentLiters}
                  onChange={(e) => setCurrentLiters(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teor ABV %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={abvPercentage}
                  onChange={(e) => setAbvPercentage(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Abastecimento</Label>
                <Input
                  type="date"
                  required
                  value={fillDate}
                  onChange={(e) => setFillDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lote / Alambicada</Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Ex: LOTE-2026/01"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Localização na Adega</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Galpão 1 - Fileira B"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas Sensoriais / Perfil do Destilado</Label>
              <Input
                value={sensoryNotes}
                onChange={(e) => setSensoryNotes(e.target.value)}
                placeholder="Ex: Notas florais marcantes, final suave com toque de baunilha"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl cursor-pointer"
              >
                {loading ? "Salvando..." : "Cadastrar Barril"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
