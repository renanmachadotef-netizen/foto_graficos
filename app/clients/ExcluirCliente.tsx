"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteClient } from "./actions";

export function ExcluirCliente({ id, nome }: { id: string; nome: string }) {
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-label={`Excluir o cliente ${nome}`}
        disabled={pendente}
        onClick={() => {
          if (!window.confirm(`Excluir o cliente "${nome}"? Não dá para desfazer.`)) return;
          setErro(null);
          comecar(async () => {
            const r = await deleteClient(id);
            if (!r.ok) setErro(r.erro);
          });
        }}
        className="text-slate-400 hover:text-red-500 transition-colors size-11 flex items-center justify-center rounded-full hover:bg-red-50 cursor-pointer disabled:opacity-50"
      >
        <Trash2 size={18} />
      </button>
      {erro && <p className="mt-1 max-w-48 text-right text-xs font-semibold text-red-700">{erro}</p>}
    </div>
  );
}
