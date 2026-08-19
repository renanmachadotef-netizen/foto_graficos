"use client";

import { useState } from "react";
import { updateMachine } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";

export function EditMachineDialog({ machine }: { machine: any }) {
  const [open, setOpen] = useState(false);
  const [maintenanceCost, setMaintenanceCost] = useState(machine.maintenanceCost.toString());
  const [powerConsumption, setPowerConsumption] = useState(machine.powerConsumption.toString());
  const [kwhPrice, setKwhPrice] = useState(machine.kwhPrice.toString());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const maint = parseFloat(maintenanceCost) || 0;
    const powerW = parseFloat(powerConsumption) || 0;
    const kwh = parseFloat(kwhPrice) || 0;
    
    const depreciationMonthly = machine.acquisitionValue / machine.usefulLifeMonths;
    const energyMonthly = (powerW / 1000) * machine.workingHours * kwh;
    const totalMonthly = depreciationMonthly + maint + energyMonthly;
    const hourlyCost = machine.workingHours > 0 ? totalMonthly / machine.workingHours : 0;

    await updateMachine(machine.id, {
      maintenanceCost: maint,
      powerConsumption: powerW,
      kwhPrice: kwh,
      hourlyCost: hourlyCost
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="text-slate-300 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"><Edit size={20}/></button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Custos: {machine.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Provisão de Manutenção (R$/mês)</Label>
            <Input type="number" required value={maintenanceCost} onChange={e => setMaintenanceCost(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Potência (Watts)</Label>
            <Input type="number" required value={powerConsumption} onChange={e => setPowerConsumption(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preço kWh (R$)</Label>
            <Input type="number" step="0.01" required value={kwhPrice} onChange={e => setKwhPrice(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
