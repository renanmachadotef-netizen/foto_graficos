"use client";

import { useState } from "react";
import { recordStockMovement } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";

interface StockMovementDialogProps {
  material: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    unitCost: number;
  };
}

export function StockMovementDialog({ material }: StockMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(material.unitCost.toString());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const qty = parseFloat(quantity.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      alert("Informe uma quantidade válida.");
      setLoading(false);
      return;
    }

    await recordStockMovement({
      materialId: material.id,
      type,
      quantity: qty,
      unitCost: type === "IN" ? parseFloat(unitCost.replace(",", ".")) : undefined,
      notes: notes || (type === "IN" ? "Entrada de Compra" : type === "OUT" ? "Saída Manual" : "Ajuste de Balanço"),
    });

    setLoading(false);
    setOpen(false);
    setQuantity("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Movimentar Estoque
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Movimentação de Estoque
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {material.name} • Estoque atual: <strong className="text-slate-800">{material.currentStock} {material.unit}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Movement Type Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Tipo de Movimentação</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("IN")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  type === "IN"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                <span>Entrada (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType("OUT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  type === "OUT"
                    ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                <span>Saída (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType("ADJUSTMENT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  type === "ADJUSTMENT"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Balanço (=)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty" className="text-xs font-medium text-slate-700">
                {type === "ADJUSTMENT" ? "Novo Saldo Total" : `Quantidade (${material.unit})`}
              </Label>
              <Input
                id="qty"
                type="number"
                step="0.01"
                required
                placeholder="Ex: 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-sm"
              />
            </div>

            {type === "IN" ? (
              <div className="space-y-1.5">
                <Label htmlFor="cost" className="text-xs font-medium text-slate-700">
                  Custo Unit. Compra (R$)
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-400">Novo Saldo Previsto</Label>
                <div className="h-9 px-3 flex items-center text-sm font-bold text-slate-800 bg-slate-100 rounded-md">
                  {type === "OUT"
                    ? `${Math.max(0, material.currentStock - (parseFloat(quantity) || 0)).toFixed(2)} ${material.unit}`
                    : type === "ADJUSTMENT"
                    ? `${(parseFloat(quantity) || 0).toFixed(2)} ${material.unit}`
                    : `${(material.currentStock + (parseFloat(quantity) || 0)).toFixed(2)} ${material.unit}`}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-slate-700">
              Motivo / Fornecedor / Observação
            </Label>
            <Input
              id="notes"
              placeholder="Ex: NF 12345 Fornecedor X, Reposição de Lona..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                type === "IN"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : type === "OUT"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            >
              {loading ? "Salvando..." : "Confirmar Movimentação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
