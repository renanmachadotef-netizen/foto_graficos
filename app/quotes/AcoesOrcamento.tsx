"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { ConfirmarDialog } from "@/components/confirmar-dialog";
import { approveQuote, rejectQuote } from "./actions";

/** Aprovar (gera a ordem de serviço) e Recusar, os dois com confirmação e separados um do outro. */
export function AcoesOrcamento({ id, cliente, total }: { id: string; cliente: string; total: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [qual, setQual] = useState<null | "aprovar" | "recusar">(null);
  const [erro, setErro] = useState<string | null>(null);

  const executar = () => {
    const acao = qual;
    if (!acao) return;
    setErro(null);
    comecar(async () => {
      try {
        if (acao === "aprovar") await approveQuote(id);
        else await rejectQuote(id);
        setQual(null);
        router.push(acao === "aprovar" ? "/quotes?aba=aprovados&aviso=aprovado" : "/quotes?aba=recusados&aviso=recusado");
      } catch {
        setErro("Não foi possível concluir. Atualize a página e tente de novo.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setErro(null); setQual("aprovar"); }}
        className="flex h-11 items-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground transition-colors hover:brightness-110 cursor-pointer"
      >
        <Check size={16} /> Aprovar orçamento
      </button>
      <button
        type="button"
        onClick={() => { setErro(null); setQual("recusar"); }}
        className="flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
      >
        <X size={16} /> Recusar
      </button>

      <ConfirmarDialog
        aberto={qual !== null}
        aoFechar={() => setQual(null)}
        titulo={qual === "aprovar" ? "Aprovar este orçamento?" : "Recusar este orçamento?"}
        descricao={
          qual === "aprovar" ? (
            <>O orçamento de <strong>{cliente}</strong> ({total}) vira venda: a ordem de serviço é criada e o valor entra em contas a receber.</>
          ) : (
            <>O orçamento de <strong>{cliente}</strong> ({total}) fica marcado como recusado e o valor a receber é cancelado.</>
          )
        }
        rotuloConfirmar={qual === "aprovar" ? "Aprovar e abrir a ordem" : "Recusar orçamento"}
        perigo={qual === "recusar"}
        pendente={pendente}
        erro={erro}
        aoConfirmar={executar}
      />
    </>
  );
}
