"use client";

import { useState, useTransition } from "react";
import { salvarRegrasLoja } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegrasLoja({ staffDiscountMax, receiptPaper, admin }: { staffDiscountMax: number; receiptPaper: string; admin: boolean }) {
  const [max, setMax] = useState(String(staffDiscountMax).replace(".", ","));
  const [papel, setPapel] = useState(receiptPaper);
  const [msg, setMsg] = useState("");
  const [pendente, iniciar] = useTransition();

  function gravar() {
    setMsg("");
    iniciar(async () => {
      const r = await salvarRegrasLoja({ staffDiscountMax: Number(max.replace(",", ".")), receiptPaper: papel });
      setMsg(r.ok ? "Salvo." : r.erro);
    });
  }

  return (
    <Card className="max-w-2xl border-slate-200 bg-card shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold text-slate-900">Regras da loja</CardTitle>
        <CardDescription className="text-xs text-slate-500">Limite de desconto do vendedor e tamanho do papel do recibo.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Desconto máximo do vendedor (% do valor dos itens)</Label>
          <Input value={max} onChange={(e) => setMax(e.target.value)} inputMode="decimal" disabled={!admin} className="max-w-[140px]" />
          <p className="text-xs text-slate-500">100 = sem limite. Gerente e administrador nunca têm limite.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Papel do recibo</Label>
          <div className="flex gap-2">
            {["80", "58"].map((p) => (
              <button
                key={p}
                type="button"
                disabled={!admin}
                onClick={() => setPapel(p)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${papel === p ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200"}`}
              >
                Bobina {p} mm
              </button>
            ))}
          </div>
        </div>
        {admin ? (
          <div className="flex items-center gap-3">
            <Button onClick={gravar} disabled={pendente}>
              {pendente ? "Salvando..." : "Salvar regras"}
            </Button>
            {msg && <span className="text-sm text-slate-600">{msg}</span>}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Só o administrador altera.</p>
        )}
      </CardContent>
    </Card>
  );
}
