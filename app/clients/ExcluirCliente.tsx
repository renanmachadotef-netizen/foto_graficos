"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmarDialog } from "@/components/confirmar-dialog";
import { deleteClient } from "./actions";

export function ExcluirCliente({ id, nome }: { id: string; nome: string }) {
  const [pendente, comecar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label={`Excluir o cliente ${nome}`}
        title="Excluir cliente"
        onClick={() => { setErro(null); setAberto(true); }}
        className="text-muted-foreground hover:text-destructive transition-colors size-11 flex items-center justify-center rounded-full hover:bg-destructive/10 cursor-pointer"
      >
        <Trash2 size={18} />
      </button>
      <ConfirmarDialog
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Excluir este cliente?"
        descricao={<>O cadastro de <strong>{nome}</strong> será apagado e não dá para desfazer. Cliente com vendas ou conta em aberto não pode ser excluído.</>}
        rotuloConfirmar="Excluir cliente"
        perigo
        pendente={pendente}
        erro={erro}
        aoConfirmar={() => {
          setErro(null);
          comecar(async () => {
            const r = await deleteClient(id);
            if (!r.ok) setErro(r.erro);
            else setAberto(false);
          });
        }}
      />
    </>
  );
}
