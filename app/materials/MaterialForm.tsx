"use client";

import { useState } from "react";
import { createMaterial } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackagePlus, Info } from "lucide-react";

export function MaterialForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("VINIL_LONA");
  const [unit, setUnit] = useState("m2");
  const [unitCost, setUnitCost] = useState("");
  const [currentStock, setCurrentStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [width, setWidth] = useState("");
  const [wasteMargin, setWasteMargin] = useState("0");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createMaterial({
      name,
      category,
      unit,
      unitCost: parseFloat(unitCost.replace(",", ".")) || 0,
      currentStock: parseFloat(currentStock.replace(",", ".")) || 0,
      minStock: parseFloat(minStock.replace(",", ".")) || 0,
      width: width ? parseFloat(width.replace(",", ".")) : null,
      wasteMargin: parseFloat(wasteMargin.replace(",", ".")) || 0,
    });
    setName("");
    setUnitCost("");
    setCurrentStock("0");
    setMinStock("0");
    setWidth("");
    setWasteMargin("0");
    setLoading(false);
  };

  return (
    <Card className="shadow-xs border-slate-200 bg-white">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4">
        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
          <PackagePlus className="w-4 h-4 text-indigo-600" />
          Cadastrar Insumo / Matéria-Prima
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Nome do Insumo</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lona Frontlight 440g, Vinil Adesivo Brilho..."
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Categoria</Label>
              <Select value={category} onValueChange={(val) => { if (val) setCategory(val); }}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VINIL_LONA">Lonas & Vinis (Rolos)</SelectItem>
                  <SelectItem value="RIGIDOS_CHAPAS">Chapas & Rígidos (PS/ACM/MDF)</SelectItem>
                  <SelectItem value="TINTAS_QUIMICOS">Tintas & Solventes</SelectItem>
                  <SelectItem value="ACESSORIOS">Acessórios (Ilhós/Fita)</SelectItem>
                  <SelectItem value="OUTROS">Outros Insumos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Unidade de Medida</Label>
              <Select value={unit} onValueChange={(val) => { if (val) setUnit(val); }}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                  <SelectItem value="ml">Metro Linear (ml)</SelectItem>
                  <SelectItem value="un">Unidade / Chapa (un)</SelectItem>
                  <SelectItem value="litro">Litro (l)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Custo ({unit})</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="R$ 0,00"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Estoque Inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Estoque Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Width for rolls */}
          {(category === "VINIL_LONA" || unit === "m2" || unit === "ml") && (
            <div className="space-y-1.5 p-2.5 border border-indigo-100 bg-indigo-50/50 rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <Label className="text-indigo-950 font-bold">Largura do Rolo (Metros)</Label>
                <span className="text-[10px] text-indigo-700">Ex: 1.06, 1.27, 1.52, 1.60</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="bg-white border-indigo-200 text-xs font-bold"
                placeholder="Ex: 1.60"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Perda Técnica / Sangria Padrão (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={wasteMargin}
              onChange={(e) => setWasteMargin(e.target.value)}
              className="text-xs"
              placeholder="Ex: 5"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2"
          >
            {loading ? "Salvando..." : "Salvar Insumo no Estoque"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
