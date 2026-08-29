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
  const [category, setCategory] = useState(material.category || "VINIL_LONA");
  const [unitCost, setUnitCost] = useState(material.unitCost.toString());
  const [minStock, setMinStock] = useState((material.minStock || 0).toString());
  const [width, setWidth] = useState((material.width || "").toString());
  const [wasteMargin, setWasteMargin] = useState(material.wasteMargin.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateMaterial(material.id, {
      name,
      category,
      unitCost: parseFloat(unitCost.replace(",", ".")) || 0,
      minStock: parseFloat(minStock.replace(",", ".")) || 0,
      width: width ? parseFloat(width.replace(",", ".")) : null,
      wasteMargin: parseFloat(wasteMargin.replace(",", ".")) || 0,
    });
    setLoading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-indigo-50"
            title="Editar Insumo"
          >
            <Edit size={16} />
          </button>
        }
      />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Editar Insumo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Insumo</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              >
                <option value="VINIL_LONA">Lonas & Vinis</option>
                <option value="RIGIDOS_CHAPAS">Chapas & Rígidos</option>
                <option value="TINTAS_QUIMICOS">Tintas & Químicos</option>
                <option value="ACESSORIOS">Acessórios & Ferragens</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo Base (R$)</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Estoque Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Largura (m)</Label>
              <Input
                type="number"
                step="0.01"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="text-xs"
                placeholder="Ex: 1.60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Perda (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={wasteMargin}
                onChange={(e) => setWasteMargin(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
