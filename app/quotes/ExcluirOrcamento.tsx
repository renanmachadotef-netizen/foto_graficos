"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmarDialog } from "@/components/confirmar-dialog";
import { excluirOrcamento } from "./actions";

export function ExcluirOrcamento({ id, titulo }: { id: string; titulo: string }) {
  const [pendente, comecar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label={`Excluir o orçamento ${titulo}`}
        onClick={() => { setErro(null); setAberto(true); }}
        className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
      >
        <Trash2 size={16} /> Excluir
      </button>
      <ConfirmarDialog
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Excluir este orçamento?"
        descricao={<>“{titulo}” será apagado de vez e não dá para desfazer.</>}
        rotuloConfirmar="Excluir orçamento"
        perigo
        pendente={pendente}
        erro={erro}
        aoConfirmar={() => {
          setErro(null);
          comecar(async () => {
            const r = await excluirOrcamento(id);
            if (!r.ok) setErro(r.erro);
            else setAberto(false);
          });
        }}
      />
    </>
  );
}
