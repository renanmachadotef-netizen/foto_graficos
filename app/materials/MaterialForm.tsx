"use client";

import { useState } from "react";
import { createMaterial } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MaterialForm() {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("m2");
  const [unitCost, setUnitCost] = useState("");
  const [width, setWidth] = useState("");
  const [wasteMargin, setWasteMargin] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMaterial({
      name,
      unit,
      unitCost: parseFloat(unitCost.replace(",", ".")),
      width: width ? parseFloat(width.replace(",", ".")) : null,
      wasteMargin: parseFloat(wasteMargin.replace(",", ".")),
    });
    setName("");
    setUnitCost("");
    setWidth("");
    setWasteMargin("0");
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-lg text-slate-700">Novo Insumo / Material</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Nome do Material</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lona Frontlight 440g, Chapa MDF 3mm..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidade de Medida</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                  <SelectItem value="ml">Metro Linear (ml)</SelectItem>
                  <SelectItem value="un">Unidade (un / chapa)</SelectItem>
                  <SelectItem value="litro">Litro (l)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custo por {unit} (R$)</Label>
              <Input required type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="Ex: 15.50" />
            </div>
          </div>

          <div className="space-y-2 p-3 border border-blue-100 bg-blue-50 rounded-md">
            <Label className="text-blue-800">Largura do Rolo (Opcional - em metros)</Label>
            <p className="text-[11px] text-blue-700/80 mb-2">
              Essencial para Mídias em Rolo (Lona, Adesivo). Se você informar "1.60", quando for calcular uma arte menor (ex: 60cm), o sistema cobrará o desperdício do metro linear que foi jogado fora!
            </p>
            <Input type="number" step="0.01" value={width} onChange={e => setWidth(e.target.value)} className="border-blue-200 bg-white" placeholder="Ex: 1.60" />
          </div>

          <div className="space-y-2">
            <Label>Margem de Perda / Sangria Padrão (%)</Label>
            <p className="text-xs text-muted-foreground">O sistema sempre adicionará essa porcentagem a mais no custo para cobrir refugo e sangria.</p>
            <Input type="number" step="0.1" value={wasteMargin} onChange={e => setWasteMargin(e.target.value)} />
          </div>

          <Button type="submit" className="w-full font-bold">Salvar Material</Button>
        </form>
      </CardContent>
    </Card>
  );
}
