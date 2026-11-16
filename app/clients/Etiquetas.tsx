"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { definirEtiquetas } from "./etiquetas-actions";

const CORES = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-violet-50 text-violet-700 border-violet-200",
];
// a cor sai do texto: a mesma etiqueta tem sempre a mesma cor em todos os clientes
const cor = (t: string) => CORES[[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];

const SUGESTOES = ["VIP", "Revenda", "Empresa", "Atenção", "Novo"];

/** Etiquetas coloridas do cliente (VIP, Revenda...). Qualquer pessoa da equipe pode mexer. */
export function Etiquetas({ clientId, inicial }: { clientId: string; inicial: string[] }) {
  const [tags, setTags] = useState(inicial);
  const [abrindo, setAbrindo] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [, iniciar] = useTransition();

  function salvar(novas: string[]) {
    const antes = tags;
    setTags(novas);
    setErro("");
    iniciar(async () => {
      const r = await definirEtiquetas(clientId, novas);
      if (!r.ok) {
        setTags(antes);
        setErro(r.erro);
      }
    });
  }
  function adicionar(t: string) {
    const limpo = t.trim().replace(/\s+/g, " ").slice(0, 20);
    if (limpo.length < 2) return;
    if (tags.some((x) => x.toLowerCase() === limpo.toLowerCase())) return;
    if (tags.length >= 8) return setErro("No máximo 8 etiquetas por cliente.");
    salvar([...tags, limpo]);
    setTexto("");
    setAbrindo(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {tags.map((t) => (
        <span key={t} className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-md px-2 py-0.5 ${cor(t)}`}>
          {t}
          <button type="button" aria-label={`Tirar etiqueta ${t}`} onClick={() => salvar(tags.filter((x) => x !== t))} className="cursor-pointer opacity-60 hover:opacity-100">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {abrindo ? (
        <span className="inline-flex items-center gap-1 flex-wrap">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionar(texto))}
            placeholder="Nova etiqueta"
            maxLength={20}
            autoFocus
            className="h-6 w-28 rounded-md border border-slate-300 px-2 text-xs"
          />
          {SUGESTOES.filter((s) => !tags.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => adicionar(s)} className="text-[11px] text-slate-500 underline cursor-pointer">
              {s}
            </button>
          ))}
        </span>
      ) : (
        <button type="button" onClick={() => setAbrindo(true)} className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer">
          <Plus className="size-3" /> etiqueta
        </button>
      )}
      {erro && <span className="text-[11px] text-red-600">{erro}</span>}
    </div>
  );
}
