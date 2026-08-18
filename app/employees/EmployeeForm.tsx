"use client";

import { useState, useEffect } from "react";
import { createEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmployeeForm() {
  const [name, setName] = useState("");
  const [contractType, setContractType] = useState("CLT_SIMPLES");
  const [baseSalary, setBaseSalary] = useState("2000");
  const [benefits, setBenefits] = useState("500");
  const [taxesPercentage, setTaxesPercentage] = useState("40");
  const [weeklyHours, setWeeklyHours] = useState("44");
  const [efficiencyPercentage, setEfficiencyPercentage] = useState("80");
  
  const [calculatedCost, setCalculatedCost] = useState(0);

  // Auto-atualizar os encargos baseado no tipo de contrato
  const handleContractChange = (val: string) => {
    setContractType(val);
    if (val === "CLT_SIMPLES") setTaxesPercentage("40");
    if (val === "CLT_NORMAL") setTaxesPercentage("70");
    if (val === "PJ") setTaxesPercentage("0");
  };

  // Cálculo matemático reativo
  useEffect(() => {
    const salary = parseFloat(baseSalary) || 0;
    const ben = parseFloat(benefits) || 0;
    const taxes = parseFloat(taxesPercentage) || 0;
    const hours = parseFloat(weeklyHours) || 0;
    const eff = parseFloat(efficiencyPercentage) || 0;

    // 1. Custo total mensal (Salário + Benefícios + % de Encargos como INSS, FGTS, Férias, 13º)
    const monthlyCost = salary + (salary * (taxes / 100)) + ben;
    
    // 2. Horas mensais teóricas (Semanas no mês = ~4.33)
    const theoreticalMonthlyHours = hours * 4.33;
    
    // 3. Horas produtivas reais (aplicando a eficiência que desconta feriados, férias e ociosidade)
    const realProductiveHours = theoreticalMonthlyHours * (eff / 100);

    const hourlyCost = realProductiveHours > 0 ? monthlyCost / realProductiveHours : 0;
    setCalculatedCost(hourlyCost);
  }, [baseSalary, benefits, taxesPercentage, weeklyHours, efficiencyPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEmployee({
      name,
      contractType,
      baseSalary: parseFloat(baseSalary),
      benefits: parseFloat(benefits),
      taxesPercentage: parseFloat(taxesPercentage),
      weeklyHours: parseInt(weeklyHours),
      efficiencyPercentage: parseFloat(efficiencyPercentage),
      hourlyCost: calculatedCost
    });
    setName("");
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-lg text-slate-700">Novo Funcionário</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Nome do Operador</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Impressão" />
          </div>

          <div className="space-y-2">
            <Label>Regime Tributário (Contrato)</Label>
            <Select value={contractType} onValueChange={handleContractChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLT_SIMPLES">CLT (Simples Nacional) ~40% Encargos</SelectItem>
                <SelectItem value="CLT_NORMAL">CLT (Lucro Presumido) ~70% Encargos</SelectItem>
                <SelectItem value="PJ">PJ / Terceirizado (Sem encargos)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">Isso preenche automaticamente a taxa de impostos, mas você pode editar abaixo.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input type="number" required value={baseSalary} onChange={e => setBaseSalary(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Benefícios (R$)</Label>
              <Input type="number" required value={benefits} onChange={e => setBenefits(e.target.value)} placeholder="VT + VR" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Encargos Tributários (%)</Label>
              <Input type="number" required value={taxesPercentage} onChange={e => setTaxesPercentage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horas Semanais</Label>
              <Input type="number" required value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 p-3 border border-amber-100 bg-amber-50 rounded-md">
            <Label className="text-amber-800">Eficiência Produtiva (%)</Label>
            <p className="text-xs text-amber-700/80 mb-2">Desconta ociosidade, DSR, média de feriados e provisão de férias. (Mercado = 75% a 85%).</p>
            <Input type="number" required value={efficiencyPercentage} onChange={e => setEfficiencyPercentage(e.target.value)} className="border-amber-200" />
          </div>

          <div className="p-4 bg-slate-800 rounded-lg mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium">Custo Final por Hora</p>
              <p className="text-xs text-slate-400">É este valor que vai para a calculadora.</p>
            </div>
            <p className="text-3xl font-bold text-white">R$ {calculatedCost.toFixed(2)}</p>
          </div>

          <Button type="submit" className="w-full font-bold">Salvar Funcionário</Button>
        </form>
      </CardContent>
    </Card>
  );
}
