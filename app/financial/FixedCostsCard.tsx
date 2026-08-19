"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { addFixedCost, deleteFixedCost } from "./actions";

export function FixedCostsCard({ fixedCosts }: { fixedCosts: any[] }) {
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleAdd = async () => {
    if (!newName || !newAmount) return;
    await addFixedCost(newName, parseFloat(newAmount.replace(",", ".")));
    setNewName("");
    setNewAmount("");
  };

  const total = fixedCosts.reduce((acc, cost) => acc + cost.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Ponto de Equilíbrio Mensal</CardTitle>
        <p className="text-xs text-slate-500">Lista completa dos seus custos operacionais fixos (Aluguel, Contador, Limpeza, etc).</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="space-y-2">
          {fixedCosts.map(cost => (
            <div key={cost.id} className="flex justify-between items-center text-sm border-b pb-2 group">
              <span className="text-slate-600 font-medium">{cost.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">R$ {cost.amount.toFixed(2)}</span>
                <button onClick={() => deleteFixedCost(cost.id)} className="text-slate-300 hover:text-red-500 opacity-20 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {fixedCosts.length === 0 && (
             <p className="text-xs text-slate-400 text-center py-2">Nenhum custo fixo cadastrado ainda.</p>
          )}
        </div>

        <div className="flex gap-2 items-end pt-2">
          <div className="flex-1">
            <Input placeholder="Nome (Ex: Aluguel)" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm h-8" />
          </div>
          <div className="w-24">
            <Input type="number" step="0.01" placeholder="R$ 0,00" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="text-sm h-8" />
          </div>
          <Button size="sm" onClick={handleAdd} className="shrink-0 h-8"><Plus size={16}/></Button>
        </div>

        <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-slate-100">
           <span className="font-bold text-slate-800">Custo Fixo Total</span>
           <span className="font-bold text-red-500 text-xl">R$ {total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
