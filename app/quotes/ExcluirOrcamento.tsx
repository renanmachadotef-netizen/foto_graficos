"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirOrcamento } from "./actions";

export function ExcluirOrcamento({ id, titulo }: { id: string; titulo: string }) {
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!window.confirm(`Excluir o orçamento "${titulo}"? Não dá para desfazer.`)) return;
          setErro(null);
          comecar(async () => {
            const r = await excluirOrcamento(id);
            if (!r.ok) setErro(r.erro);
          });
        }}
        className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
      >
        <Trash2 size={16} /> {pendente ? "Excluindo…" : "Excluir"}
      </button>
      {erro && <p className="mt-1 max-w-56 text-right text-xs font-semibold text-red-700">{erro}</p>}
    </div>
  );
}
