"use client";

import { useState, useTransition } from "react";
import { definirLimiteFiado } from "@/app/settings/actions";

export function LimiteFiado({ clientId, limite }: { clientId: string; limite: number | null }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(limite != null ? String(limite).replace(".", ",") : "");
  const [atual, setAtual] = useState(limite);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function gravar() {
    setErro("");
    const txt = valor.trim();
    const n = txt === "" ? null : Number(txt.replace(/\./g, "").replace(",", "."));
    if (n != null && !Number.isFinite(n)) return setErro("Valor invalido");
    iniciar(async () => {
      const r = await definirLimiteFiado(clientId, n);
      if (!r.ok) return setErro(r.erro);
      setAtual(n);
      setEditando(false);
    });
  }

  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)} className="text-[11px] text-slate-500 hover:text-indigo-600 underline decoration-dotted">
        Limite do fiado: {atual != null ? atual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "sem limite"}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="sem limite" inputMode="decimal" className="w-24 border border-slate-300 rounded px-1.5 py-0.5" />
      <button type="button" disabled={pendente} onClick={gravar} className="font-bold text-indigo-600">
        Salvar
      </button>
      <button type="button" onClick={() => setEditando(false)} className="text-slate-400">
        Cancelar
      </button>
      {erro && <span className="text-red-600">{erro}</span>}
    </span>
  );
}
