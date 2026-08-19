"use client";

import { useState } from "react";
import { updateEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";

export function EditEmployeeDialog({ employee }: { employee: any }) {
  const [open, setOpen] = useState(false);
  const [baseSalary, setBaseSalary] = useState(employee.baseSalary.toString());
  const [benefits, setBenefits] = useState(employee.benefits.toString());
  const [taxesPercentage, setTaxesPercentage] = useState(employee.taxesPercentage.toString());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const salary = parseFloat(baseSalary) || 0;
    const ben = parseFloat(benefits) || 0;
    const taxes = parseFloat(taxesPercentage) || 0;
    const hours = employee.weeklyHours;
    const eff = employee.efficiencyPercentage;
    
    const monthlyCost = salary + (salary * (taxes / 100)) + ben;
    const realProductiveHours = (hours * 4.33) * (eff / 100);
    const hourlyCost = realProductiveHours > 0 ? monthlyCost / realProductiveHours : 0;

    await updateEmployee(employee.id, {
      baseSalary: salary,
      benefits: ben,
      taxesPercentage: taxes,
      hourlyCost: hourlyCost
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="text-slate-300 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"><Edit size={20}/></button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Custos: {employee.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Salário Base (R$)</Label>
            <Input type="number" required value={baseSalary} onChange={e => setBaseSalary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Benefícios (R$)</Label>
            <Input type="number" required value={benefits} onChange={e => setBenefits(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Encargos Tributários (%)</Label>
            <Input type="number" required value={taxesPercentage} onChange={e => setTaxesPercentage(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
