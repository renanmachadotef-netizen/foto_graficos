"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Wine,
  Sparkles,
  Clock,
  Flame,
  Droplet,
  Layers,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  ArrowRight,
  Filter,
  Award,
  Wheat,
  Thermometer,
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
import { createRecipeAction, deleteRecipeAction } from "./actions";
import { WOOD_PROFILES } from "@/app/barrels/BarrelsClientView";

export interface RecipeItem {
  id: string;
  name: string;
  category: string;
  woodType: string;
  agingMonths: number;
  targetAbv: number;
  sugarBrix?: number | null;
  fermentationType?: string | null;
  fermentationHours?: number | null;
  distillationType?: string | null;
  heartCutPercent?: number | null;
  sensoryProfile?: string | null;
  instructions?: string | null;
  active: boolean;
}

interface RecipesClientViewProps {
  initialRecipes: RecipeItem[];
  tenantConfig: TenantConfig;
  userRole: string;
}

export function RecipesClientView({
  initialRecipes,
  tenantConfig,
  userRole,
}: RecipesClientViewProps) {
  const [recipes, setRecipes] = useState<RecipeItem[]>(initialRecipes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Create Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("EXTRA_PREMIUM");
  const [woodType, setWoodType] = useState("AMBURANA");
  const [agingMonths, setAgingMonths] = useState("24");
  const [targetAbv, setTargetAbv] = useState("42.0");
  const [sugarBrix, setSugarBrix] = useState("16.5");
  const [fermentationType, setFermentationType] = useState("LEVEDURA_SELVAGEM");
  const [fermentationHours, setFermentationHours] = useState("30");
  const [distillationType, setDistillationType] = useState("ALAMBIQUE_COBRE");
  const [heartCutPercent, setHeartCutPercent] = useState("80");
  const [sensoryProfile, setSensoryProfile] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchCat = selectedCategory === "ALL" || r.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.sensoryProfile && r.sensoryProfile.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newRec = await createRecipeAction({
        name,
        category,
        woodType,
        agingMonths: parseInt(agingMonths, 10) || 12,
        targetAbv: parseFloat(targetAbv) || 42,
        sugarBrix: parseFloat(sugarBrix) || 16,
        fermentationType,
        fermentationHours: parseInt(fermentationHours, 10) || 30,
        distillationType,
        heartCutPercent: parseFloat(heartCutPercent) || 80,
        sensoryProfile,
        instructions,
      });

      setRecipes([newRec, ...recipes]);
      setIsOpen(false);
      setName("");
      setSensoryProfile("");
      setInstructions("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta receita?")) return;
    await deleteRecipeAction(id);
    setRecipes(recipes.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Lovable Header - Caderno de Receitas */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-950 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-amber-700/50">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-md text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-amber-300" />
            Caderno do Mestre Alambiqueiro
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Receitas & Processos de Fabricação
          </h1>
          <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Guarde o segredo de cada rótulo da Cachaçaria Pura Brasil: desde o grau Brix da garapa, tempo de dorna de fermentação, cortes do alambique até os meses de maturação em madeira.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-950/40 rounded-2xl gap-2 cursor-pointer text-sm py-6 px-6 transform hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Receita de Cachaça
          </Button>
        </div>

        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none text-9xl">
          📖
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "Todas as Receitas", count: recipes.length },
            { id: "EXTRA_PREMIUM", label: "👑 Extra Premium (2+ anos)", count: recipes.filter(r => r.category === "EXTRA_PREMIUM").length },
            { id: "PREMIUM", label: "🪵 Premium (1 ano)", count: recipes.filter(r => r.category === "PREMIUM").length },
            { id: "BLEND", label: "✨ Blends Especiais", count: recipes.filter(r => r.category === "BLEND").length },
            { id: "PRATA", label: "🛡️ Prata Clássica (Inox)", count: recipes.filter(r => r.category === "PRATA").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === tab.id
                  ? "bg-amber-900 text-white shadow-md shadow-amber-900/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                selectedCategory === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar receita ou perfil sensorial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-2xl bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredRecipes.length === 0 && (
        <Card className="rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-12 text-center">
          <BookOpen className="w-12 h-12 text-amber-600/60 mx-auto mb-3" />
          <h3 className="text-lg font-black text-amber-950">Nenhuma receita encontrada</h3>
          <p className="text-xs text-amber-800/80 mt-1 max-w-md mx-auto">
            Clique no botão acima para cadastrar a primeira receita do alambique com seus processos e tempos de maturação.
          </p>
        </Card>
      )}

      {/* Recipes Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecipes.map((recipe) => {
          const woodInfo = WOOD_PROFILES[recipe.woodType] || WOOD_PROFILES.AMBURANA;
          const agingYears = (recipe.agingMonths / 12).toFixed(1);

          return (
            <Card
              key={recipe.id}
              className="rounded-3xl border-amber-200/80 bg-white/95 shadow-sm hover:shadow-xl hover:border-amber-400/80 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-amber-100 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-950 flex items-center justify-center text-3xl text-white shadow-md shadow-amber-950/20 shrink-0">
                      {woodInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-lg leading-tight">{recipe.name}</h3>
                      </div>
                      <p className="text-xs font-bold text-amber-900 mt-0.5 flex items-center gap-1.5">
                        <span>{woodInfo.name}</span>
                        <span>•</span>
                        <Badge className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                          {recipe.category.replace("_", " ")}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Graduação Alvo</span>
                    <span className="text-lg font-black text-amber-950 font-mono">{recipe.targetAbv}% ABV</span>
                  </div>
                </div>

                {/* Body - Fazeres & Etapas do Processo */}
                <div className="p-6 space-y-5">
                  {/* Timeline Steps */}
                  <div className="space-y-2">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Etapas do Mestre Alambiqueiro:
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {/* Step 1: Garapa */}
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-center">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-1">
                          <Wheat className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Garapa / Cana</p>
                        <p className="text-xs font-black text-slate-900 mt-0.5">{recipe.sugarBrix || "16.0"}° Brix</p>
                      </div>

                      {/* Step 2: Fermentação */}
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-center">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-1">
                          <Thermometer className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Fermentação</p>
                        <p className="text-xs font-black text-slate-900 mt-0.5">{recipe.fermentationHours || "30"}h em Dorna</p>
                      </div>

                      {/* Step 3: Alambique */}
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-center">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-1">
                          <Flame className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Corte Coração</p>
                        <p className="text-xs font-black text-slate-900 mt-0.5">{recipe.heartCutPercent || "80"}% Alambique</p>
                      </div>

                      {/* Step 4: Barril */}
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-300 text-center">
                        <div className="w-7 h-7 rounded-xl bg-amber-700 text-white mx-auto flex items-center justify-center mb-1">
                          <Clock className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-bold text-amber-900 uppercase">Maturação</p>
                        <p className="text-xs font-black text-amber-950 mt-0.5">
                          {recipe.agingMonths >= 12 ? `${agingYears} anos` : `${recipe.agingMonths} meses`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sensory Profile */}
                  {recipe.sensoryProfile && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                      <span className="font-black flex items-center gap-1.5 text-amber-900">
                        <Award className="w-3.5 h-3.5 text-amber-600" /> Perfil Sensorial & Degustação:
                      </span>
                      <p className="italic text-slate-700">{recipe.sensoryProfile}</p>
                    </div>
                  )}

                  {/* Instructions */}
                  {recipe.instructions && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900">Instruções de Fabricação:</span>
                      <p className="text-slate-600 line-clamp-3">{recipe.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <a href={`/barrels`} className="w-full">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Wine className="w-3.5 h-3.5" />
                    Ver Barris desta Madeira
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </a>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(recipe.id)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE RECIPE MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              Cadastrar Nova Receita de Cachaça
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina os parâmetros de fermentação, destilação e tempo de maturação deste rótulo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecipe} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nome do Rótulo / Cachaça *</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cachaça Pura Brasil Amburana Reserva"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Categoria *</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-amber-600"
                >
                  <option value="EXTRA_PREMIUM">👑 Extra Premium (Mínimo 2 Anos)</option>
                  <option value="PREMIUM">🪵 Premium (Mínimo 1 Ano)</option>
                  <option value="ENVELHECIDA">🍂 Envelhecida (Mínimo 6 Meses)</option>
                  <option value="BLEND">✨ Blend Especial de Madeiras</option>
                  <option value="PRATA">🛡️ Prata Clássica (Dorna Inox)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tempo de Maturação (Meses)</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={agingMonths}
                  onChange={(e) => setAgingMonths(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Graduação Alvo (% ABV)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={targetAbv}
                  onChange={(e) => setTargetAbv(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Fazeres & Processos */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Parâmetros de Destilação & Fermentação:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Grau Brix da Garapa</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={sugarBrix}
                    onChange={(e) => setSugarBrix(e.target.value)}
                    placeholder="16.0"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Tempo Fermentação (Horas)</Label>
                  <Input
                    type="number"
                    value={fermentationHours}
                    onChange={(e) => setFermentationHours(e.target.value)}
                    placeholder="28"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">% Corte Coração</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={heartCutPercent}
                    onChange={(e) => setHeartCutPercent(e.target.value)}
                    placeholder="80"
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Notas Sensoriais / Descrição de Degustação</Label>
              <Input
                value={sensoryProfile}
                onChange={(e) => setSensoryProfile(e.target.value)}
                placeholder="Ex: Aromas intensos de canela e flor de laranjeira, corpo aveludado e final doce."
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Instruções / Segredos do Mestre</Label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Passo a passo especial para o operador durante a safra..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none focus:border-amber-600"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl py-5 cursor-pointer text-sm shadow-md"
              >
                {loading ? "Gravando Receita..." : "Salvar Receita no Caderno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
