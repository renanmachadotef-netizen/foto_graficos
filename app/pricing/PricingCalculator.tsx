"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Calculator } from "lucide-react";

type Material = { id: string; name: string; unitCost: number; unit: string; wasteMargin: number; width: number | null; };
type Machine = { id: string; name: string; hourlyCost: number; productivity: number; };
type Employee = { id: string; name: string; hourlyCost: number; };

type ProcessStep = {
  id: string; // unique local id
  type: "machine" | "employee";
  resourceId: string;
  setupTimeMin: number; // Fixo para o lote
  unitTimeMin: number;  // Variável por unidade
};

type MaterialUsage = {
  id: string; // unique local id
  materialId: string;
  usagePerUnit: number; // Quantidade gasta por 1 unidade (m2, ml, un)
};

export function PricingCalculator({ 
  materials, 
  machines, 
  employees 
}: { 
  materials: Material[], 
  machines: Machine[], 
  employees: Employee[] 
}) {
  const [productName, setProductName] = useState("Placa de Aviso");
  const [markup, setMarkup] = useState("100"); // 100% de lucro sobre o custo
  
  const [usedMaterials, setUsedMaterials] = useState<MaterialUsage[]>([]);
  const [workflow, setWorkflow] = useState<ProcessStep[]>([]);

  // Helpers to add items
  const addMaterial = () => setUsedMaterials([...usedMaterials, { id: Math.random().toString(), materialId: "", usagePerUnit: 1 }]);
  const addStep = (type: "machine" | "employee") => setWorkflow([...workflow, { id: Math.random().toString(), type, resourceId: "", setupTimeMin: 0, unitTimeMin: 0 }]);

  // Calculations for a specific quantity
  const simulateForQuantity = (qty: number) => {
    let totalMaterialCost = 0;
    let totalSetupCost = 0;
    let totalProductionCost = 0;

    // 1. Materiais (Variável com a quantidade)
    usedMaterials.forEach(um => {
      const mat = materials.find(m => m.id === um.materialId);
      if (mat) {
        // Custo = Consumo por unidade * Qtd * Custo Unitário * Fator de Perda
        const wasteFactor = 1 + (mat.wasteMargin / 100);
        totalMaterialCost += (um.usagePerUnit * qty) * mat.unitCost * wasteFactor;
      }
    });

    // 2. Processos (Tempo de Setup diluído + Tempo de Produção)
    workflow.forEach(step => {
      let hourlyRate = 0;
      if (step.type === "machine") hourlyRate = machines.find(m => m.id === step.resourceId)?.hourlyCost || 0;
      if (step.type === "employee") hourlyRate = employees.find(e => e.id === step.resourceId)?.hourlyCost || 0;

      const ratePerMin = hourlyRate / 60;
      
      // O Setup é cobrado apenas 1 vez para todo o lote
      totalSetupCost += step.setupTimeMin * ratePerMin;
      // A produção é multiplicada pela quantidade
      totalProductionCost += (step.unitTimeMin * qty) * ratePerMin;
    });

    const totalCost = totalMaterialCost + totalSetupCost + totalProductionCost;
    const unitCost = totalCost / qty;
    const finalPriceUnit = unitCost * (1 + parseFloat(markup) / 100);

    return { totalCost, unitCost, finalPriceUnit };
  };

  const simulationQuantities = [1, 10, 50, 100, 500];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lado Esquerdo: Construtor do Orçamento */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Materiais */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-slate-700">1. Materiais Utilizados</CardTitle>
            <Button size="sm" variant="outline" onClick={addMaterial}><Plus size={16} className="mr-1"/> Adicionar Insumo</Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {usedMaterials.length === 0 && <p className="text-sm text-slate-500">Nenhum material adicionado.</p>}
            {usedMaterials.map((um, index) => (
              <div key={um.id} className="flex gap-4 items-end bg-white p-3 border rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Insumo</Label>
                  <Select value={um.materialId} onValueChange={v => { const n = [...usedMaterials]; n[index].materialId = v; setUsedMaterials(n); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (R$ {m.unitCost}/{m.unit})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Gasto p/ 1 Unid.</Label>
                  <Input type="number" step="0.01" value={um.usagePerUnit} onChange={e => { const n = [...usedMaterials]; n[index].usagePerUnit = parseFloat(e.target.value)||0; setUsedMaterials(n); }} />
                </div>
                <Button variant="ghost" className="text-red-500 px-2" onClick={() => setUsedMaterials(usedMaterials.filter(x => x.id !== um.id))}><Trash2 size={18}/></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Roteiro de Produção */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-slate-700">2. Roteiro de Produção (Workflow)</CardTitle>
            <div className="space-x-2">
              <Button size="sm" variant="outline" onClick={() => addStep("machine")}><Plus size={16} className="mr-1"/> Máquina</Button>
              <Button size="sm" variant="outline" onClick={() => addStep("employee")}><Plus size={16} className="mr-1"/> Mão de Obra</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {workflow.length === 0 && <p className="text-sm text-slate-500">Nenhuma etapa de produção adicionada.</p>}
            {workflow.map((step, index) => (
              <div key={step.id} className="flex gap-4 items-end bg-white p-3 border rounded-lg">
                <div className="w-16 flex items-center justify-center font-bold text-slate-300">#{index + 1}</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{step.type === 'machine' ? 'Máquina Utilizada' : 'Mão de Obra (Funcionário)'}</Label>
                  <Select value={step.resourceId} onValueChange={v => { const n = [...workflow]; n[index].resourceId = v; setWorkflow(n); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {step.type === 'machine' 
                        ? machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (R$ {m.hourlyCost.toFixed(2)}/h)</SelectItem>)
                        : employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} (R$ {e.hourlyCost.toFixed(2)}/h)</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs text-amber-600 font-bold" title="Tempo gasto preparando a máquina ou ajustando a arte. Cobrado 1 vez por lote.">Setup (min)</Label>
                  <Input type="number" className="border-amber-200 bg-amber-50" value={step.setupTimeMin} onChange={e => { const n = [...workflow]; n[index].setupTimeMin = parseFloat(e.target.value)||0; setWorkflow(n); }} />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs text-blue-600 font-bold" title="Tempo gasto para produzir 1 única unidade.">Produção (min/un)</Label>
                  <Input type="number" className="border-blue-200 bg-blue-50" value={step.unitTimeMin} onChange={e => { const n = [...workflow]; n[index].unitTimeMin = parseFloat(e.target.value)||0; setWorkflow(n); }} />
                </div>
                <Button variant="ghost" className="text-red-500 px-2" onClick={() => setWorkflow(workflow.filter(x => x.id !== step.id))}><Trash2 size={18}/></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lado Direito: Resultados e Escala */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="bg-slate-800 text-white shadow-xl border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator /> Tabela de Preços</CardTitle>
            <p className="text-slate-400 text-sm">A mágica da diluição do custo de Setup na quantidade.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Produto</Label>
              <Input className="bg-slate-700 border-slate-600 text-white" value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Margem de Lucro (Markup %)</Label>
              <Input type="number" className="bg-slate-700 border-slate-600 text-white" value={markup} onChange={e => setMarkup(e.target.value)} />
            </div>

            <div className="mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left pb-2">Qtd</th>
                    <th className="text-right pb-2">Custo Unid.</th>
                    <th className="text-right pb-2 text-green-400">Venda Unid.</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationQuantities.map(qty => {
                    const res = simulateForQuantity(qty);
                    return (
                      <tr key={qty} className="border-b border-slate-700/50">
                        <td className="py-3 font-bold">{qty}x</td>
                        <td className="py-3 text-right text-slate-300">R$ {res.unitCost.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold text-green-400 text-lg">R$ {res.finalPriceUnit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-500 mt-4 text-center">
                O valor unitário cai drasticamente conforme a quantidade aumenta, porque o Custo do Setup das máquinas é pago apenas uma vez e dividido entre todas as peças.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
