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
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  FileSpreadsheet,
  BookOpen,
  Wheat,
  User,
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
  createBarrelAction,
  deleteBarrelAction,
  recordBarrelMovementAction,
  updateBarrelAction,
  applyAngelsShareAction,
} from "./actions";
import Link from "next/link";

export interface MovementItem {
  id: string;
  type: string;
  liters: number;
  resultingLiters: number;
  date: Date | string;
  batchNumber?: string | null;
  abvPercentage?: number | null;
  responsibleName?: string | null;
  notes?: string | null;
}

export interface BarrelItem {
  id: string;
  code: string;
  woodType: string;
  capacityLiters: number;
  currentLiters: number;
  costPerLiter?: number;
  evaporationRateAnnual?: number;
  abvPercentage: number;
  fillDate: Date | string;
  batchNumber: string;
  status: string;
  sensoryNotes?: string | null;
  location?: string | null;
  movements?: MovementItem[];
}

interface BarrelsClientViewProps {
  initialBarrels: BarrelItem[];
  bottlingRuns: any[];
  yearlyProducedLiters?: number;
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
  yearlyProducedLiters = 0,
  tenantConfig,
  userRole,
}: BarrelsClientViewProps) {
  const [barrels, setBarrels] = useState<BarrelItem[]>(initialBarrels);
  const [selectedWoodFilter, setSelectedWoodFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );

  // Create Barrel Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [woodType, setWoodType] = useState("AMBURANA");
  const [capacityLiters, setCapacityLiters] = useState("200");
  const [currentLiters, setCurrentLiters] = useState("200");
  const [abvPercentage, setAbvPercentage] = useState("42.0");
  const [fillDate, setFillDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchNumber, setBatchNumber] = useState(`LOTE-${new Date().getFullYear()}/01`);
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [location, setLocation] = useState("Adega Principal - Fileira A");

  // Movement Modal (Input/Output)
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"INPUT" | "OUTPUT">("INPUT");
  const [selectedBarrelForMovement, setSelectedBarrelForMovement] = useState<BarrelItem | null>(null);
  const [movLiters, setMovLiters] = useState("50");
  const [movDate, setMovDate] = useState(new Date().toISOString().split("T")[0]);
  const [movBatch, setMovBatch] = useState("");
  const [movAbv, setMovAbv] = useState("42.0");
  const [movResponsible, setMovResponsible] = useState("Mestre Alambiqueiro");
  const [movNotes, setMovNotes] = useState("");

  // Barrel History Modal
  const [historyBarrel, setHistoryBarrel] = useState<BarrelItem | null>(null);

  // Angel's Share Modal
  const [isAngelsShareOpen, setIsAngelsShareOpen] = useState(false);
  const [angelsShareBarrel, setAngelsShareBarrel] = useState<BarrelItem | null>(null);
  const [evaporationPercent, setEvaporationPercent] = useState("3.0");
  const [angelsShareDate, setAngelsShareDate] = useState(new Date().toISOString().split("T")[0]);
  const [angelsShareNotes, setAngelsShareNotes] = useState("");

  const [loading, setLoading] = useState(false);

  const handleApplyAngelsShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!angelsShareBarrel) return;
    setLoading(true);
    try {
      await applyAngelsShareAction({
        barrelId: angelsShareBarrel.id,
        evaporationPercentage: parseFloat(evaporationPercent) || 3.0,
        date: angelsShareDate,
        notes: angelsShareNotes,
      });
      setIsAngelsShareOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalLiters = useMemo(() => {
    return barrels.reduce((acc, b) => acc + b.currentLiters, 0);
  }, [barrels]);

  const totalCapacity = useMemo(() => {
    return barrels.reduce((acc, b) => acc + b.capacityLiters, 0);
  }, [barrels]);

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

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarrelForMovement) return;
    setLoading(true);
    try {
      const res = await recordBarrelMovementAction({
        barrelId: selectedBarrelForMovement.id,
        type: movementType,
        liters: parseFloat(movLiters) || 0,
        date: movDate,
        batchNumber: movBatch || selectedBarrelForMovement.batchNumber,
        abvPercentage: parseFloat(movAbv) || selectedBarrelForMovement.abvPercentage,
        responsibleName: movResponsible,
        notes: movNotes,
      });

      setIsMovementOpen(false);
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
      return `${years} anos (${months}m)`;
    } catch {
      return "Recém abastecido";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner - Lovable Adega & Mestre Alambiqueiro */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <Wine className="w-4 h-4 text-amber-300" />
            Adega de Envelhecimento & Rastreabilidade
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Meus Barris • Pura Brasil
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Controle de ponta a ponta: registre as entradas da alambicada, saídas para envase de garrafas, tempo de repouso em madeira e o extrato completo de cada tonel.
          </p>
        </div>

        {/* Big Friendly Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link href="/recipes">
            <Button
              size="lg"
              className="bg-white/15 hover:bg-white/25 text-white border border-amber-300/40 backdrop-blur-md rounded-2xl font-bold gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
            >
              <BookOpen className="w-4 h-4 text-yellow-300" />
              Caderno de Receitas
            </Button>
          </Link>

          <Button
            size="lg"
            onClick={() => {
              if (barrels.length > 0) setSelectedBarrelForMovement(barrels[0]);
              setMovementType("INPUT");
              setIsMovementOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-950/30 rounded-2xl gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <ArrowDownCircle className="w-5 h-5 text-emerald-900" />
            Entrou Cachaça (Alambicada)
          </Button>

          <Button
            size="lg"
            onClick={() => setIsCreateOpen(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-xl shadow-yellow-500/20 rounded-2xl gap-2 cursor-pointer text-xs sm:text-sm py-6 px-5"
          >
            <Plus className="w-5 h-5" />
            Novo Barril
          </Button>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          🥃
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Safra {new Date().getFullYear()}</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Wheat className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {yearlyProducedLiters > 0 ? yearlyProducedLiters.toLocaleString("pt-BR") : totalLiters.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-semibold text-slate-500">Litros</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Produção alambicada no ano
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Volume em Barris</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalLiters.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">L</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Capacidade total: {totalCapacity.toLocaleString("pt-BR")} L
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Garrafas Potenciais</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Wine className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              ~{potentialBottles.toLocaleString("pt-BR")} <span className="text-xs font-semibold text-slate-500">Unidades</span>
            </p>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Garrafas padrão 750ml
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Tonéis na Adega</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {barrels.length} <span className="text-xs font-semibold text-slate-500">Barris</span>
            </p>
            <p className="text-xs text-emerald-700 font-bold mt-1">
              Rastreabilidade ativa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs by Wood Type */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWoodFilter("ALL")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
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
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{prof.icon}</span>
                <span>{prof.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por barril ou lote..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-2xl bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Barrels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarrels.map((barrel) => {
          const woodInfo = WOOD_PROFILES[barrel.woodType] || WOOD_PROFILES.CARVALHO_FRANCES;
          const fillPercentage = Math.min(100, Math.round((barrel.currentLiters / barrel.capacityLiters) * 100));
          const agingTime = calculateAgingTime(barrel.fillDate);
          const movementsCount = barrel.movements?.length || 0;

          return (
            <Card
              key={barrel.id}
              className="rounded-3xl border-amber-200/80 bg-white/95 shadow-sm hover:shadow-xl hover:border-amber-400/80 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Header with Wood Header Bar */}
                <div className="p-5 pb-4 border-b border-amber-100/80 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/40 to-white">
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
                              : barrel.status === "EMPTY"
                              ? "bg-slate-400 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {barrel.status === "AGING" ? "Maturando" : barrel.status === "READY" ? "Pronto" : "Vazio"}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-amber-900 mt-0.5">{woodInfo.name}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {barrel.batchNumber}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  {/* Gauge & Liters Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600 flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-amber-600" />
                        Volume Atual
                      </span>
                      <span className="font-black text-slate-900">
                        {barrel.currentLiters} L <span className="text-slate-400 font-normal">/ {barrel.capacityLiters} L</span>
                      </span>
                    </div>

                    <div className="w-full h-3.5 rounded-full bg-amber-100 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-500"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric Pills */}
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="bg-amber-50/70 p-2.5 rounded-2xl text-center border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Teor ABV</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{barrel.abvPercentage}%</p>
                    </div>

                    <div className="bg-amber-50/70 p-2.5 rounded-2xl text-center border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Envelhecido</p>
                      <p className="text-xs font-black text-slate-900 mt-1 truncate">{agingTime}</p>
                    </div>

                    <div className="bg-amber-50/70 p-2.5 rounded-2xl text-center border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-800/80">Garrafas</p>
                      <p className="text-sm font-black text-amber-900 mt-0.5">
                        ~{Math.floor(barrel.currentLiters / 0.75)}
                      </p>
                    </div>
                  </div>

                  {/* Sensory Notes */}
                  {barrel.sensoryNotes && (
                    <div className="p-3 rounded-2xl bg-amber-50/40 border border-amber-100 text-xs text-slate-700">
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

              {/* Card Footer - Movimentação & Extrato & Angel's Share */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setHistoryBarrel(barrel)}
                    className="w-1/2 border-amber-200 text-amber-900 hover:bg-amber-50 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-amber-700" />
                    Extrato ({movementsCount})
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedBarrelForMovement(barrel);
                      setMovementType("OUTPUT");
                      setIsMovementOpen(true);
                    }}
                    className="w-1/2 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5 text-amber-300" />
                    Retirar p/ Envase
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAngelsShareBarrel(barrel);
                    setEvaporationPercent(String(barrel.evaporationRateAnnual || 3.0));
                    setIsAngelsShareOpen(true);
                  }}
                  className="w-full text-[11px] font-bold text-amber-900 hover:bg-amber-100/60 rounded-xl gap-1.5 h-7 cursor-pointer"
                >
                  🪽 Angel's Share (Evaporação) • R$ {(barrel.costPerLiter || 12).toFixed(2)}/L
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ANGEL'S SHARE MODAL */}
      <Dialog open={isAngelsShareOpen} onOpenChange={setIsAngelsShareOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              🪽 Angel's Share • Evaporação Natural
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Os poros da madeira respiram e evaporam parte da cachaça ("a parte dos anjos"). O volume físico diminui no Kardex e o custo por litro restante aumenta proporcionalmente para preservar o valor total imobilizado.
            </DialogDescription>
          </DialogHeader>

          {angelsShareBarrel && (
            <form onSubmit={handleApplyAngelsShare} className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <p className="font-bold text-amber-950">
                  Barril: <strong>{angelsShareBarrel.code}</strong> ({WOOD_PROFILES[angelsShareBarrel.woodType]?.name})
                </p>
                <p className="text-slate-600">
                  Saldo Físico Atual: <strong>{angelsShareBarrel.currentLiters} L</strong> • Custo Atual: <strong>R$ {(angelsShareBarrel.costPerLiter || 12).toFixed(2)} / Litro</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">% Evaporação Anual *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={evaporationPercent}
                    onChange={(e) => setEvaporationPercent(e.target.value)}
                    className="rounded-xl text-base font-black text-amber-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Data do Abate</Label>
                  <Input
                    type="date"
                    required
                    value={angelsShareDate}
                    onChange={(e) => setAngelsShareDate(e.target.value)}
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Simulation Result */}
              {(() => {
                const ep = parseFloat(evaporationPercent) || 0;
                const lostLiters = (angelsShareBarrel.currentLiters * ep) / 100;
                const resultingLiters = Math.max(0, angelsShareBarrel.currentLiters - lostLiters);
                const currentCost = angelsShareBarrel.costPerLiter || 12.0;
                const newCost = resultingLiters > 0 ? (angelsShareBarrel.currentLiters * currentCost) / resultingLiters : currentCost;

                return (
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Volume Evaporado:</span>
                      <span className="font-bold text-rose-400">-{lostLiters.toFixed(2)} Litros</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Novo Saldo Restante:</span>
                      <span className="font-black text-white">{resultingLiters.toFixed(2)} Litros</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800">
                      <span className="text-amber-300 font-bold">Novo Custo por Litro:</span>
                      <span className="font-black text-amber-300 text-sm">R$ {newCost.toFixed(2)} / L</span>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-2xl py-5 text-sm"
                >
                  {loading ? "Processando..." : "Confirmar Abate do Angel's Share"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* RECORD MOVEMENT DIALOG (INPUT / OUTPUT) */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              {movementType === "INPUT" ? (
                <ArrowDownCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <ArrowUpCircle className="w-6 h-6 text-amber-600" />
              )}
              {movementType === "INPUT" ? "Entrada de Cachaça (Alambicada)" : "Retirada para Envase / Blending"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {movementType === "INPUT"
                ? "Registre a cachaça destilada que está entrando no barril para iniciar ou completar a maturação."
                : "Registre a quantidade de litros retirada do barril para engarrafar ou transferir."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordMovement} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Selecione o Barril *</Label>
              <select
                value={selectedBarrelForMovement?.id || ""}
                onChange={(e) => {
                  const b = barrels.find((x) => x.id === e.target.value);
                  if (b) setSelectedBarrelForMovement(b);
                }}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-amber-600"
              >
                {barrels.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} • {WOOD_PROFILES[b.woodType]?.name} (Saldo: {b.currentLiters}L / {b.capacityLiters}L)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  {movementType === "INPUT" ? "Litros que Entraram (+)" : "Litros Retirados (-)"}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={movLiters}
                  onChange={(e) => setMovLiters(e.target.value)}
                  className="rounded-xl text-base font-black text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Data do Evento *</Label>
                <Input
                  type="date"
                  required
                  value={movDate}
                  onChange={(e) => setMovDate(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote / Alambicada</Label>
                <Input
                  value={movBatch}
                  onChange={(e) => setMovBatch(e.target.value)}
                  placeholder={selectedBarrelForMovement?.batchNumber || "Ex: LOTE-2026/01"}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Teor Alcoólico (% ABV)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={movAbv}
                  onChange={(e) => setMovAbv(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Responsável</Label>
              <Input
                value={movResponsible}
                onChange={(e) => setMovResponsible(e.target.value)}
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Motivo / Observações</Label>
              <Input
                value={movNotes}
                onChange={(e) => setMovNotes(e.target.value)}
                placeholder={
                  movementType === "INPUT"
                    ? "Ex: Alambicada de corte de coração da safra nova"
                    : "Ex: Envase de 60 garrafas de 750ml para restaurante"
                }
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-sm cursor-pointer ${
                  movementType === "INPUT"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    : "bg-amber-700 hover:bg-amber-800 text-white shadow-md"
                }`}
              >
                {loading ? "Registrando..." : "Gravar Movimentação no Extrato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BARREL HISTORY / KARDEX MODAL */}
      <Dialog open={!!historyBarrel} onOpenChange={() => setHistoryBarrel(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                Extrato do Barril: {historyBarrel?.code}
              </div>
              <Badge className="bg-amber-100 text-amber-950 font-black text-xs">
                Saldo: {historyBarrel?.currentLiters}L / {historyBarrel?.capacityLiters}L
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Histórico detalhado de tudo o que entrou e saiu deste tonel desde o início do envelhecimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {(!historyBarrel?.movements || historyBarrel.movements.length === 0) && (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs text-slate-500">Nenhuma movimentação registrada individualmente ainda.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abastecido em {historyBarrel ? new Date(historyBarrel.fillDate).toLocaleDateString("pt-BR") : ""}.
                </p>
              </div>
            )}

            {historyBarrel?.movements && historyBarrel.movements.length > 0 && (
              <div className="space-y-2.5">
                {historyBarrel.movements.map((mov) => {
                  const isInput = mov.type === "INPUT";

                  return (
                    <div
                      key={mov.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isInput ? "bg-emerald-50/60 border-emerald-200/80" : "bg-amber-50/60 border-amber-200/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isInput ? "bg-emerald-600 text-white" : "bg-amber-700 text-white"
                          }`}
                        >
                          {isInput ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {isInput ? "Entrada (+)" : "Saída (-)"} {mov.liters} Litros
                            </span>
                            {mov.batchNumber && (
                              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                                {mov.batchNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {mov.notes || (isInput ? "Abastecimento da alambicada" : "Retirada para envase")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Por: {mov.responsibleName || "Mestre"} • {new Date(mov.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Após</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {mov.resultingLiters} L
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE BARREL MODAL */}
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
                <Label className="text-xs font-bold text-slate-700">Código / Identificação *</Label>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: BARRIL-07, TON-02"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipo de Madeira *</Label>
                <select
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-amber-600"
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
                <Label className="text-xs font-bold text-slate-700">Capacidade (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={capacityLiters}
                  onChange={(e) => setCapacityLiters(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Volume Inicial (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={currentLiters}
                  onChange={(e) => setCurrentLiters(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Teor ABV %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={abvPercentage}
                  onChange={(e) => setAbvPercentage(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Data de Início</Label>
                <Input
                  type="date"
                  required
                  value={fillDate}
                  onChange={(e) => setFillDate(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Lote / Alambicada</Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Ex: LOTE-2026/01"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Localização na Adega</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Galpão 1 - Fileira B"
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Notas Sensoriais / Perfil do Destilado</Label>
              <Input
                value={sensoryNotes}
                onChange={(e) => setSensoryNotes(e.target.value)}
                placeholder="Ex: Notas florais marcantes, final suave com toque de baunilha"
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-2xl py-5 cursor-pointer text-sm"
              >
                {loading ? "Salvando..." : "Cadastrar Barril na Adega"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
