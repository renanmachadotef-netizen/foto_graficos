"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderArte } from "@/app/arte/actions";

export function FormResposta({ token }: { token: string }) {
  const router = useRouter();
  const [ajuste, setAjuste] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function enviar(resposta: "approved" | "changes") {
    setErro("");
    iniciar(async () => {
      const r = await responderArte(token, resposta, texto);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <p className="text-sm text-slate-600 text-center">Confira a arte com calma: nome, telefone, cores e medidas. Depois de aprovar, a produção começa.</p>
      {!ajuste ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <button disabled={pendente} onClick={() => enviar("approved")} className="h-12 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">
            ✓ Aprovar a arte
          </button>
          <button disabled={pendente} onClick={() => setAjuste(true)} className="h-12 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Pedir ajuste
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">O que precisa mudar?</label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={4} className="w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Ex.: trocar o telefone, deixar o fundo mais claro…" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <button disabled={pendente} onClick={() => setAjuste(false)} className="h-11 rounded-xl border border-slate-300 font-semibold">
              Voltar
            </button>
            <button disabled={pendente} onClick={() => enviar("changes")} className="h-11 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50">
              Enviar pedido de ajuste
            </button>
          </div>
        </div>
      )}
      {erro && <p className="text-sm text-red-600 font-semibold text-center">{erro}</p>}
    </div>
  );
}
