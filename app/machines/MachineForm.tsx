"use client";

import { useState, useEffect } from "react";
import { createMachine } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MachineForm() {
  const [name, setName] = useState("");
  const [acquisitionValue, setAcquisitionValue] = useState("15000");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("60"); // 5 anos
  const [maintenanceCost, setMaintenanceCost] = useState("300"); // Provisão mensal
  const [powerConsumption, setPowerConsumption] = useState("1500"); // Watts
  const [kwhPrice, setKwhPrice] = useState("0.95"); // R$
  const [workingHours, setWorkingHours] = useState("120"); // Horas de uso por mês
  
  const [calculatedCost, setCalculatedCost] = useState({
    depreciation: 0,
    energy: 0,
    totalMonthly: 0,
    hourly: 0
  });

  useEffect(() => {
    const val = parseFloat(acquisitionValue) || 0;
    const life = parseInt(usefulLifeMonths) || 1;
    const maint = parseFloat(maintenanceCost) || 0;
    const powerW = parseFloat(powerConsumption) || 0;
    const kwh = parseFloat(kwhPrice) || 0;
    const hours = parseInt(workingHours) || 1;

    // 1. Depreciação Mensal (Desgaste/Provisão de nova máquina)
    const depreciationMonthly = val / life;

    // 2. Consumo de Energia Mensal: (Watts / 1000) * Horas * Preço do kWh
    const energyMonthly = (powerW / 1000) * hours * kwh;

    // 3. Custo Total Mensal da Máquina
    const totalMonthly = depreciationMonthly + maint + energyMonthly;

    // 4. Custo da Hora-Máquina
    const hourly = hours > 0 ? totalMonthly / hours : 0;

    setCalculatedCost({
      depreciation: depreciationMonthly,
      energy: energyMonthly,
      totalMonthly,
      hourly
    });
  }, [acquisitionValue, usefulLifeMonths, maintenanceCost, powerConsumption, kwhPrice, workingHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMachine({
      name,
      acquisitionValue: parseFloat(acquisitionValue),
      usefulLifeMonths: parseInt(usefulLifeMonths),
      maintenanceCost: parseFloat(maintenanceCost),
      powerConsumption: parseFloat(powerConsumption),
      kwhPrice: parseFloat(kwhPrice),
      workingHours: parseInt(workingHours),
      hourlyCost: calculatedCost.hourly
    });
    setName("");
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-lg text-slate-700">Nova Máquina</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Nome / Modelo</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Plotter Roland, CNC Laser..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor da Máquina (R$)</Label>
              <Input type="number" required value={acquisitionValue} onChange={e => setAcquisitionValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vida Útil (Meses)</Label>
              <p className="text-[10px] text-slate-500 mb-1">Padrão contábil: 60 meses (5 anos).</p>
              <Input type="number" required value={usefulLifeMonths} onChange={e => setUsefulLifeMonths(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 p-3 border border-amber-100 bg-amber-50 rounded-md">
            <Label className="text-amber-800">Provisão de Manutenção (R$/Mês)</Label>
            <p className="text-[11px] text-amber-700/80 mb-2">Sim, as manutenções (troca de correia, cabeça de impressão, tubos laser) entram aqui! Estime um gasto médio mensal.</p>
            <Input type="number" required value={maintenanceCost} onChange={e => setMaintenanceCost(e.target.value)} className="border-amber-200 bg-white" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Potência (Watts)</Label>
              <Input type="number" required value={powerConsumption} onChange={e => setPowerConsumption(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preço kWh (R$)</Label>
              <Input type="number" step="0.01" required value={kwhPrice} onChange={e => setKwhPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horas de Uso/Mês</Label>
              <Input type="number" required value={workingHours} onChange={e => setWorkingHours(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
             <div className="p-2 bg-slate-50 rounded border text-center">
               <p className="text-[10px] text-slate-500 uppercase font-bold">Depreciação</p>
               <p className="text-sm font-semibold text-slate-700">R$ {calculatedCost.depreciation.toFixed(2)}/mês</p>
             </div>
             <div className="p-2 bg-slate-50 rounded border text-center">
               <p className="text-[10px] text-slate-500 uppercase font-bold">Energia</p>
               <p className="text-sm font-semibold text-slate-700">R$ {calculatedCost.energy.toFixed(2)}/mês</p>
             </div>
             <div className="p-2 bg-slate-50 rounded border text-center">
               <p className="text-[10px] text-slate-500 uppercase font-bold">Total Mensal</p>
               <p className="text-sm font-semibold text-slate-700">R$ {calculatedCost.totalMonthly.toFixed(2)}</p>
             </div>
          </div>

          <div className="p-4 bg-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium">Custo Final Hora-Máquina</p>
              <p className="text-xs text-slate-400">Pronto para a calculadora.</p>
            </div>
            <p className="text-3xl font-bold text-white">R$ {calculatedCost.hourly.toFixed(2)}</p>
          </div>

          <Button type="submit" className="w-full font-bold">Salvar Máquina</Button>
        </form>
      </CardContent>
    </Card>
  );
}
