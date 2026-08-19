"use client";

import { useState } from "react";
import { updateMaterial } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";

export function EditMaterialDialog({ material }: { material: any }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(material.name);
  const [unitCost, setUnitCost] = useState(material.unitCost.toString());
  const [wasteMargin, setWasteMargin] = useState(material.wasteMargin.toString());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMaterial(material.id, {
      name,
      unitCost: parseFloat(unitCost) || 0,
      wasteMargin: parseFloat(wasteMargin) || 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button className="text-slate-300 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"><Edit size={20}/></button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Insumo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nome do Insumo</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo Base (R$)</Label>
              <Input type="number" step="0.01" required value={unitCost} onChange={e => setUnitCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Margem de Perda (%)</Label>
              <Input type="number" step="0.01" required value={wasteMargin} onChange={e => setWasteMargin(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
