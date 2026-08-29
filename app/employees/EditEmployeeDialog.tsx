"use client";

import { useState } from "react";
import { updateEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Crown, UserCheck } from "lucide-react";

export function EditEmployeeDialog({ employee }: { employee: any }) {
  const [open, setOpen] = useState(false);
  const [contractType, setContractType] = useState(employee.contractType || "CLT_SIMPLES");
  const [baseSalary, setBaseSalary] = useState(employee.baseSalary.toString());
  const [benefits, setBenefits] = useState(employee.benefits.toString());
  const [taxesPercentage, setTaxesPercentage] = useState(employee.taxesPercentage.toString());
  const [weeklyHours, setWeeklyHours] = useState((employee.weeklyHours || 44).toString());
  const [efficiencyPercentage, setEfficiencyPercentage] = useState((employee.efficiencyPercentage || 85).toString());
  const [loading, setLoading] = useState(false);

  const isOwner = contractType === "PROPRIETARIO_PROLABORE";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const salary = parseFloat(baseSalary) || 0;
      const ben = parseFloat(benefits) || 0;
      const taxes = parseFloat(taxesPercentage) || 0;
      const hours = parseInt(weeklyHours) || 44;
      const eff = parseFloat(efficiencyPercentage) || 85;

      const monthlyCost = salary + salary * (taxes / 100) + ben;
      const realProductiveHours = hours * 4.33 * (eff / 100);
      const hourlyCost = realProductiveHours > 0 ? monthlyCost / realProductiveHours : 0;

      await updateEmployee(employee.id, {
        contractType,
        baseSalary: salary,
        benefits: ben,
        taxesPercentage: taxes,
        weeklyHours: hours,
        efficiencyPercentage: eff,
        hourlyCost: hourlyCost,
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-xl hover:bg-indigo-50 cursor-pointer"><Edit size={18} /></button>} />
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            {isOwner ? <Crown className="w-5 h-5 text-amber-600" /> : <UserCheck className="w-5 h-5 text-indigo-600" />}
            Editar Remuneração: {employee.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Atualize o pró-labore ou salário e os encargos para recalcular o custo-hora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Papel / Regime</Label>
            <Select value={contractType} onValueChange={(v) => v && setContractType(v)}>
              <SelectTrigger className="rounded-xl text-xs font-bold bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="PROPRIETARIO_PROLABORE">👑 Proprietário / Sócio (Pró-Labore)</SelectItem>
                <SelectItem value="CLT_SIMPLES">🏢 CLT - Simples Nacional (~40%)</SelectItem>
                <SelectItem value="CLT_NORMAL">🏛️ CLT - Lucro Presumido (~70%)</SelectItem>
                <SelectItem value="PJ">💼 PJ / Prestador</SelectItem>
                <SelectItem value="ESTAGIARIO">🎓 Estagiário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {isOwner ? "Pró-Labore (R$)" : "Salário Base (R$)"}
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
                {isOwner ? "Retiradas Extras (R$)" : "Benefícios (R$)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Encargos (%)</Label>
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

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
