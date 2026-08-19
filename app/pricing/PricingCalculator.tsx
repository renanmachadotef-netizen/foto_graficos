"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveQuote } from "./actions";
import { askPricingAI } from "./ai-actions";
import { Sparkles, Loader2, Trash2, Plus, Calculator, Save } from "lucide-react";

type Material = { id: string; name: string; unitCost: number; unit: string; wasteMargin: number; width: number | null; };
type Machine = { id: string; name: string; hourlyCost: number; productivity: number; };
type Employee = { id: string; name: string; hourlyCost: number; };
type Client = { id: string; name: string; document: string | null; };

type ProcessStep = {
  id: string;
  type: "machine" | "employee";
  resourceId: string;
  setupTimeMin: number;
  unitTimeMin: number;
};

type MaterialUsage = {
  id: string;
  materialId: string;
  calcMode: "manual" | "area" | "perimeter";
  width: number;
  height: number;
  usagePerUnit: number;
};

type MarkupTier = {
  id: string;
  min: number;
  max: number;
  markup: number;
};

export function PricingCalculator({ 
  materials, machines, employees, clients
}: { 
  materials: Material[], machines: Machine[], employees: Employee[], clients: Client[]
}) {
  const router = useRouter();
  const [productName, setProductName] = useState("Produto Customizado");
  
  // Markup Escalonado (Dinâmico)
  const [markupTiers, setMarkupTiers] = useState<MarkupTier[]>([
    { id: "1", min: 1, max: 5, markup: 300 },
    { id: "2", min: 6, max: 49, markup: 150 },
    { id: "3", min: 50, max: 999999, markup: 80 }
  ]);

  // Taxas Comerciais
  const [taxRate, setTaxRate] = useState("6"); // NF-e Simples Nacional
  const [cardFeeRate, setCardFeeRate] = useState("3"); // Taxa Média de Cartão/Intermediação

  const [targetQty, setTargetQty] = useState("1");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{type: 'success' | 'warning' | 'error', text: string} | null>(null);

  const [usedMaterials, setUsedMaterials] = useState<MaterialUsage[]>([]);
  const [workflow, setWorkflow] = useState<ProcessStep[]>([]);

  // ... (AI function remains unchanged)
  const handleAskAI = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    setAiMessage(null);
    
    const res = await askPricingAI(aiPrompt);
    
    if (res.status === "error") {
      setAiMessage({ type: 'error', text: res.message });
    } else {
      if (res.status === "mock") {
        setAiMessage({ type: 'warning', text: res.message });
      } else {
        setAiMessage({ type: 'success', text: res.message });
      }
      
      const payload = res.data as any;
      if (payload.productName) setProductName(payload.productName);
      if (payload.targetQty) setTargetQty(payload.targetQty.toString());
      
      if (payload.usedMaterials) {
        setUsedMaterials(payload.usedMaterials.map((m: any) => ({
          id: Math.random().toString(),
          materialId: m.materialId,
          calcMode: "manual",
          width: 0,
          height: 0,
          usagePerUnit: m.usagePerUnit
        })));
      }
      if (payload.workflow) {
        setWorkflow(payload.workflow.map((w: any) => ({
          ...w,
          id: Math.random().toString()
        })));
      }
    }
    setIsAiLoading(false);
  };

  // Helpers to add items
  const addMaterial = () => setUsedMaterials([...usedMaterials, { id: Math.random().toString(), materialId: "", calcMode: "manual", width: 0, height: 0, usagePerUnit: 1 }]);
  const addStep = (type: "machine" | "employee") => setWorkflow([...workflow, { id: Math.random().toString(), type, resourceId: "", setupTimeMin: 0, unitTimeMin: 0 }]);

  const getMarkupForQuantity = (qty: number) => {
    const sortedTiers = [...markupTiers].sort((a, b) => a.min - b.min);
    const tier = sortedTiers.find(t => qty >= t.min && qty <= t.max);
    return tier ? tier.markup : (sortedTiers[sortedTiers.length - 1]?.markup || 100);
  };

  const simulateForQuantity = (qty: number) => {
    const totalSetupMin = workflow.reduce((acc, step) => acc + step.setupTimeMin, 0);
    const setupCostPerUnit = workflow.reduce((acc, step) => {
      const rateHour = step.type === 'machine' 
        ? machines.find(m => m.id === step.resourceId)?.hourlyCost || 0 
        : employees.find(e => e.id === step.resourceId)?.hourlyCost || 0;
      return acc + (rateHour / 60) * (step.setupTimeMin / qty);
    }, 0);

    let unitVarCost = 0;
    workflow.forEach(step => {
      const rateHour = step.type === 'machine' ? machines.find(m => m.id === step.resourceId)?.hourlyCost || 0 : employees.find(e => e.id === step.resourceId)?.hourlyCost || 0;
      unitVarCost += (rateHour / 60) * step.unitTimeMin;
    });

    usedMaterials.forEach(um => {
      const m = materials.find(x => x.id === um.materialId);
      if (m) {
        const costWithWaste = m.unitCost * (1 + (m.wasteMargin / 100));
        unitVarCost += costWithWaste * um.usagePerUnit;
      }
    });

    const unitCost = setupCostPerUnit + unitVarCost;
    const currentMarkup = getMarkupForQuantity(qty);
    const finalPriceUnit = unitCost * (1 + (currentMarkup / 100));
    const totalCost = unitCost * qty;

    // Deduções Financeiras
    const parsedTax = parseFloat(taxRate) || 0;
    const parsedCard = parseFloat(cardFeeRate) || 0;
    const taxAmount = finalPriceUnit * (parsedTax / 100);
    const cardAmount = finalPriceUnit * (parsedCard / 100);
    
    const netProfitUnit = finalPriceUnit - unitCost - taxAmount - cardAmount;
    const netProfitMargin = (netProfitUnit / finalPriceUnit) * 100;

    return { 
      totalCost, 
      unitCost, 
      finalPriceUnit, 
      appliedMarkup: currentMarkup, 
      netProfitUnit, 
      netProfitMargin,
      taxAmount,
      cardAmount
    };
  };

  const handleSaveQuote = async () => {
    if (!selectedClientId) return alert("Por favor, selecione um cliente no painel abaixo.");
    const qty = parseInt(targetQty) || 1;
    const res = simulateForQuantity(qty);
    
    setIsSaving(true);
    const quoteId = await saveQuote({
      clientId: selectedClientId,
      title: productName,
      totalCost: res.totalCost,
      markup: res.appliedMarkup,
      finalPrice: res.finalPriceUnit * qty,
      taxRate: parseFloat(taxRate) || 0,
      cardFeeRate: parseFloat(cardFeeRate) || 0,
      netProfit: res.netProfitUnit * qty,
      items: [{
        description: productName,
        quantity: qty,
        unitCost: res.unitCost,
        unitPrice: res.finalPriceUnit
      }]
    });
    setIsSaving(false);
    router.push(`/quotes/${quoteId}`);
  };

  const simulationQuantities = [1, 10, 50, 100, 500];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lado Esquerdo: Construtor do Orçamento */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Assistente de Inteligência Artificial */}
        <Card className="border-2 border-purple-200 bg-purple-50/30 overflow-hidden shadow-sm">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-fuchsia-50 pb-4">
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={20} /> Assistente de Produção Mágica (IA)
            </CardTitle>
            <p className="text-sm text-purple-700/80">Descreva o que o cliente quer. A IA vai ler seu estoque e montar a receita do orçamento sozinha.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex gap-2">
              <Input 
                className="bg-white border-purple-200 focus-visible:ring-purple-500"
                placeholder="Ex: 'Quero 50 faixas de 2x1 metros em lona com ilhós'" 
                value={aiPrompt} 
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAI()}
              />
              <Button onClick={handleAskAI} disabled={isAiLoading || !aiPrompt} className="bg-purple-600 hover:bg-purple-700 text-white min-w-32">
                {isAiLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
                {isAiLoading ? "Pensando..." : "Gerar Roteiro"}
              </Button>
            </div>
            {aiMessage && (
              <div className={`p-3 rounded-md text-sm border ${
                aiMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
                aiMessage.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-green-50 border-green-200 text-green-700'
              }`}>
                {aiMessage.text}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Materiais */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg text-slate-700">1. Materiais Utilizados</CardTitle>
              <p className="text-xs text-slate-500 font-normal mt-1">Calcule por medidas exatas para evitar erros (Módulo Anti-Burrice).</p>
            </div>
            <Button size="sm" variant="outline" onClick={addMaterial}><Plus size={16} className="mr-1"/> Adicionar Insumo</Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {usedMaterials.length === 0 && <p className="text-sm text-slate-500">Nenhum material adicionado.</p>}
            {usedMaterials.map((um, index) => {
              const selectedMat = materials.find(m => m.id === um.materialId);
              
              const updateRow = (updates: Partial<MaterialUsage>) => {
                const n = [...usedMaterials];
                const row = { ...n[index], ...updates };
                // Auto-calculation logic
                if (row.calcMode === "area") row.usagePerUnit = row.width * row.height;
                if (row.calcMode === "perimeter") row.usagePerUnit = (row.width + row.height) * 2;
                n[index] = row;
                setUsedMaterials(n);
              };

              return (
                <div key={um.id} className="bg-white p-3 border rounded-lg space-y-3">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-bold text-slate-600">Insumo / Material</Label>
                      <Select value={um.materialId} onValueChange={(v: string | null) => { if (v) updateRow({ materialId: v }); }}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue placeholder="Selecione...">
                            {selectedMat?.name || "Selecione..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (R$ {m.unitCost.toFixed(2)}/{m.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-40 space-y-1">
                      <Label className="text-xs font-bold text-slate-600">Modo de Cálculo</Label>
                      <Select value={um.calcMode} onValueChange={(v: any) => updateRow({ calcMode: v })}>
                        <SelectTrigger className="bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Livre (Manual)</SelectItem>
                          <SelectItem value="area">Área (L x A)</SelectItem>
                          <SelectItem value="perimeter">Perímetro (Bordas)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2" onClick={() => setUsedMaterials(usedMaterials.filter(x => x.id !== um.id))}><Trash2 size={18}/></Button>
                  </div>

                  {/* Anti-Burrice Inputs */}
                  <div className="flex gap-4 items-center bg-slate-50 p-2 rounded border border-slate-100">
                    {um.calcMode !== "manual" && (
                      <>
                        <div className="w-24 space-y-1">
                          <Label className="text-[10px] uppercase text-slate-500">Largura (m)</Label>
                          <Input type="number" step="0.01" className="h-8 text-sm" value={um.width} onChange={e => updateRow({ width: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-[10px] uppercase text-slate-500">Altura (m)</Label>
                          <Input type="number" step="0.01" className="h-8 text-sm" value={um.height} onChange={e => updateRow({ height: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="flex-1 flex items-center pt-5 px-2">
                          <span className="text-sm font-bold text-slate-400">
                            ➔ {um.calcMode === "area" ? "L × A =" : "(L + A) × 2 ="}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="w-32 space-y-1 ml-auto">
                      <Label className="text-[10px] uppercase font-bold text-blue-600">
                        Total Gasto ({selectedMat?.unit || 'un'})
                      </Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className={`h-8 text-sm font-bold ${um.calcMode !== 'manual' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                        readOnly={um.calcMode !== "manual"}
                        value={um.usagePerUnit} 
                        onChange={e => updateRow({ usagePerUnit: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>

                </div>
              );
            })}
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
                  <Select value={step.resourceId} onValueChange={(v: string | null) => { if (v) { const n = [...workflow]; n[index].resourceId = v; setWorkflow(n); } }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione...">
                        {step.type === 'machine' 
                          ? machines.find(m => m.id === step.resourceId)?.name 
                          : employees.find(e => e.id === step.resourceId)?.name 
                          || "Selecione..."}
                      </SelectValue>
                    </SelectTrigger>
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

            {/* Painel de Regras de Margem Dinâmica */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300 font-bold text-xs uppercase tracking-wider">Regras de Margem (Markup)</Label>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => setMarkupTiers([...markupTiers, { id: Math.random().toString(), min: 1, max: 10, markup: 100 }])}
                >
                  <Plus size={12} className="mr-1"/> Add Regra
                </Button>
              </div>
              
              {markupTiers.sort((a,b) => a.min - b.min).map((tier, index) => (
                <div key={tier.id} className="flex gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">De</span>
                    <Input type="number" className="w-16 h-7 text-xs bg-slate-800 border-slate-600 text-white px-1 text-center" 
                      value={tier.min} onChange={e => { const n = [...markupTiers]; n[index].min = parseInt(e.target.value)||0; setMarkupTiers(n); }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Até</span>
                    <Input type="number" className="w-16 h-7 text-xs bg-slate-800 border-slate-600 text-white px-1 text-center" 
                      value={tier.max} onChange={e => { const n = [...markupTiers]; n[index].max = parseInt(e.target.value)||0; setMarkupTiers(n); }} />
                  </div>
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-700 ml-1">
                    <span className="text-xs text-green-400 font-bold">➔</span>
                    <Input type="number" className="w-16 h-7 text-xs font-bold bg-green-900/30 border-green-700/50 text-green-400 px-1 text-center" 
                      value={tier.markup} onChange={e => { const n = [...markupTiers]; n[index].markup = parseFloat(e.target.value)||0; setMarkupTiers(n); }} />
                    <span className="text-xs text-green-500">%</span>
                  </div>
                  <button onClick={() => setMarkupTiers(markupTiers.filter(t => t.id !== tier.id))} className="text-slate-500 hover:text-red-400 ml-auto">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Custos Comerciais (Impostos e Taxas) */}
            <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-800/50 p-4 border border-slate-700 rounded-lg">
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Imposto (NF-e)</Label>
                <div className="relative">
                  <Input type="number" step="0.1" className="bg-slate-700 border-slate-600 text-white pl-8" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Taxa Cartão</Label>
                <div className="relative">
                  <Input type="number" step="0.1" className="bg-slate-700 border-slate-600 text-white pl-8" value={cardFeeRate} onChange={e => setCardFeeRate(e.target.value)} />
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left pb-2">Qtd</th>
                    <th className="text-right pb-2">Custo</th>
                    <th className="text-right pb-2 text-blue-400">Lucro Líquido</th>
                    <th className="text-right pb-2 text-green-400">Venda Final</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationQuantities.map(qty => {
                    const res = simulateForQuantity(qty);
                    return (
                      <tr key={qty} className="border-b border-slate-700/50">
                        <td className="py-3 font-bold">{qty}x</td>
                        <td className="py-3 text-right text-slate-400">R$ {res.unitCost.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <p className="font-bold text-blue-400">R$ {res.netProfitUnit.toFixed(2)}</p>
                          <p className="text-[10px] text-blue-500/70">{res.netProfitMargin.toFixed(1)}% real</p>
                        </td>
                        <td className="py-3 text-right font-bold text-green-400 text-lg">R$ {res.finalPriceUnit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-500 mt-4 text-center">
                O Lucro Líquido já deduz o Custo da Fábrica e os Custos Comerciais (Impostos e Cartão).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gerador de Proposta (Integração CRM) */}
        <Card className="border-2 border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-800 flex items-center gap-2"><Save size={20}/> Salvar Proposta (CRM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">Cliente</Label>
              <Select value={selectedClientId} onValueChange={(val: string | null) => { if (val) setSelectedClientId(val); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o Cliente">
                    {clients.find(c => c.id === selectedClientId)?.name || "Selecione o Cliente"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="none" disabled>Nenhum cliente cadastrado.</SelectItem>}
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">Quantidade Fechada</Label>
              <Input type="number" className="bg-white" value={targetQty} onChange={e => setTargetQty(e.target.value)} />
            </div>

            <Button onClick={handleSaveQuote} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
              {isSaving ? "Gerando PDF..." : "Gerar Proposta Comercial"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
