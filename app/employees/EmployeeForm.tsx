"use client";

import { useState, useEffect } from "react";
import { createEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, UserCheck, Briefcase, HelpCircle, Sparkles } from "lucide-react";

export function EmployeeForm() {
  const [name, setName] = useState("");
  const [contractType, setContractType] = useState("PROPRIETARIO_PROLABORE");
  const [baseSalary, setBaseSalary] = useState("5000");
  const [benefits, setBenefits] = useState("0");
  const [taxesPercentage, setTaxesPercentage] = useState("11");
  const [weeklyHours, setWeeklyHours] = useState("44");
  const [efficiencyPercentage, setEfficiencyPercentage] = useState("85");
  
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = contractType === "PROPRIETARIO_PROLABORE";

  // Auto-atualizar encargos baseado no tipo de contrato selecionado
  const handleContractChange = (val: string | null) => {
    if (!val) return;
    setContractType(val);
    if (val === "PROPRIETARIO_PROLABORE") {
      setTaxesPercentage("11"); // Retenção INSS padrão pró-labore
      setBenefits("0");
      if (baseSalary === "2000") setBaseSalary("5000");
    } else if (val === "CLT_SIMPLES") {
      setTaxesPercentage("40"); // FGTS + 13º + Férias + 1/3
      setBenefits("500");
      if (baseSalary === "5000") setBaseSalary("2200");
    } else if (val === "CLT_NORMAL") {
      setTaxesPercentage("70"); // INSS Patronal + FGTS + Provisões
      setBenefits("500");
    } else if (val === "PJ") {
      setTaxesPercentage("0"); // Prestador NF
      setBenefits("0");
    } else if (val === "ESTAGIARIO") {
      setTaxesPercentage("0");
      setBenefits("300");
      setWeeklyHours("30");
    }
  };

  // Cálculo matemático reativo
  useEffect(() => {
    const salary = parseFloat(baseSalary) || 0;
    const ben = parseFloat(benefits) || 0;
    const taxes = parseFloat(taxesPercentage) || 0;
    const hours = parseFloat(weeklyHours) || 0;
    const eff = parseFloat(efficiencyPercentage) || 0;

    // 1. Custo total mensal (Pró-labore/Salário + Benefícios + % de Encargos)
    const monthlyCost = salary + (salary * (taxes / 100)) + ben;
    
    // 2. Horas mensais teóricas (Semanas no mês = ~4.33)
    const theoreticalMonthlyHours = hours * 4.33;
    
    // 3. Horas produtivas reais
    const realProductiveHours = theoreticalMonthlyHours * (eff / 100);

    const hourlyCost = realProductiveHours > 0 ? monthlyCost / realProductiveHours : 0;
    setCalculatedCost(hourlyCost);
  }, [baseSalary, benefits, taxesPercentage, weeklyHours, efficiencyPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createEmployee({
        name,
        contractType,
        baseSalary: parseFloat(baseSalary) || 0,
        benefits: parseFloat(benefits) || 0,
        taxesPercentage: parseFloat(taxesPercentage) || 0,
        weeklyHours: parseInt(weeklyHours) || 44,
        efficiencyPercentage: parseFloat(efficiencyPercentage) || 85,
        hourlyCost: calculatedCost,
      });
      setName("");
      if (!isOwner) {
        setBaseSalary("2200");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-md border-amber-200/80 rounded-2xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 border-b border-amber-100/80 pb-4">
        <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
          {isOwner ? (
            <Crown className="w-5 h-5 text-amber-600" />
          ) : (
            <UserCheck className="w-5 h-5 text-indigo-600" />
          )}
          Cadastrar Membro / Proprietário
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              {isOwner ? "Nome do Proprietário / Sócio *" : "Nome do Colaborador / Operador *"}
            </Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isOwner ? "Ex: Renan Machado (Proprietário)" : "Ex: João Silva (Impressor / Operador)"}
              className="rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Papel & Regime de Contratação *</Label>
            <Select value={contractType} onValueChange={handleContractChange}>
              <SelectTrigger className="rounded-xl text-xs font-bold bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="PROPRIETARIO_PROLABORE" className="font-bold text-amber-900">
                  👑 Proprietário / Sócio (Pró-Labore)
                </SelectItem>
                <SelectItem value="CLT_SIMPLES">
                  🏢 CLT - Simples Nacional (~40% Encargos)
                </SelectItem>
                <SelectItem value="CLT_NORMAL">
                  🏛️ CLT - Lucro Presumido / Real (~70% Encargos)
                </SelectItem>
                <SelectItem value="PJ">
                  💼 PJ / Prestador de Serviço (0% Encargos)
                </SelectItem>
                <SelectItem value="ESTAGIARIO">
                  🎓 Estagiário / Menor Aprendiz (Bolsa)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500 font-normal">
              {isOwner
                ? "O pró-labore é a remuneração dos sócios e compõe o custo fixo e a precificação da empresa."
                : "Ajusta automaticamente os percentuais de encargos e provisões trabalhistas."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {isOwner ? "Pró-Labore Mensal (R$)" : "Salário Base (R$)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="rounded-xl text-xs font-black text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {isOwner ? "Retiradas Extras (R$)" : "Benefícios VT/VR (R$)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="R$ 0,00"
                className="rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {isOwner ? "Encargos / INSS Retido (%)" : "Encargos Trabalhistas (%)"}
              </Label>
              <Input
                type="number"
                step="0.1"
                required
                value={taxesPercentage}
                onChange={(e) => setTaxesPercentage(e.target.value)}
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Horas Semanais</Label>
              <Input
                type="number"
                required
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5 p-3.5 border border-amber-200/80 bg-amber-50/50 rounded-2xl">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-amber-950">Eficiência Produtiva Real (%)</Label>
              <span className="text-xs font-black text-amber-900">{efficiencyPercentage}%</span>
            </div>
            <p className="text-[11px] text-amber-900/80">
              Desconta ociosidade, pausas e feriados para achar o custo hora produtivo real. (Padrão: 80% a 90%).
            </p>
            <Input
              type="number"
              required
              value={efficiencyPercentage}
              onChange={(e) => setEfficiencyPercentage(e.target.value)}
              className="border-amber-300 bg-white h-8 text-xs font-bold rounded-lg"
            />
          </div>

          {/* Result Banner */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white flex items-center justify-between shadow-md">
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Custo Hora-Homem
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                R$ {calculatedCost.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ hora</span>
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`font-black text-xs px-5 py-5 rounded-xl shadow-lg cursor-pointer ${
                isOwner
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
              }`}
            >
              {isSubmitting ? "Salvando..." : isOwner ? "Salvar Pró-Labore" : "Adicionar Funcionário"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
