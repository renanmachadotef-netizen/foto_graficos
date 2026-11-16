"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Link2, MessageCircle, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listarArtes, excluirArte, type ArteLinha } from "@/app/arte/actions";

/** Arte do pedido: a loja envia, copia o link (ou manda por WhatsApp) e o cliente aprova sem login. */
export function PainelArte({ quoteId, telefone, onVistas }: { quoteId: string; telefone: string | null; onVistas?: () => void }) {
  const [artes, setArtes] = useState<ArteLinha[] | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const l = await listarArtes(quoteId);
    setArtes(l);
    if (l.some((a) => a.resposta)) onVistas?.();
  }, [quoteId, onVistas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar(f: File) {
    setErro("");
    setEnviando(true);
    const fd = new FormData();
    fd.set("quoteId", quoteId);
    fd.set("file", f);
    try {
      const r = await fetch("/api/arte", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) setErro(j.erro || "Nao foi possivel enviar.");
      else await carregar();
    } catch {
      setErro("Sem conexao. Tente de novo.");
    }
    setEnviando(false);
    if (entrada.current) entrada.current.value = "";
  }

  const link = (t: string) => `${window.location.origin}/aprovar/${t}`;
  async function copiar(t: string) {
    try {
      await navigator.clipboard.writeText(link(t));
      setCopiado(t);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      window.prompt("Copie o link:", link(t));
    }
  }
  function zap(t: string) {
    let d = (telefone ?? "").replace(/\D/g, "").replace(/^0+/, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    const msg = `Olá! Segue a arte do seu pedido para aprovar: ${link(t)}`;
    window.open(d.length >= 12 ? `https://wa.me/${d}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm">Arte para o cliente aprovar</p>
        <Button size="sm" variant="outline" disabled={enviando} onClick={() => entrada.current?.click()} className="cursor-pointer">
          {enviando ? <Loader2 className="animate-spin" /> : <Upload />} Enviar arte
        </Button>
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
      </div>
      {erro && <p className="text-sm text-rose-700 font-semibold">{erro}</p>}
      {artes === null && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {artes?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma arte enviada ainda. JPG, PNG, WebP ou PDF até 10 MB.</p>}
      {artes?.map((a) => (
        <div key={a.id} className="rounded-lg bg-muted/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium truncate">
              v{a.versao} · {a.nome}
            </span>
            {a.resposta === "approved" && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="size-4" /> Aprovada
              </span>
            )}
            {a.resposta === "changes" && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                <AlertCircle className="size-4" /> Pediu ajuste
              </span>
            )}
            {!a.resposta && <span className="text-muted-foreground">aguardando</span>}
          </div>
          {a.comentario && <p className="text-sm bg-amber-50 text-amber-900 rounded px-2 py-1">“{a.comentario}”</p>}
          {a.respondidaEm && <p className="text-xs text-muted-foreground">Respondida em {new Date(a.respondidaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => copiar(a.token)} className="cursor-pointer">
              <Link2 /> {copiado === a.token ? "Copiado!" : "Copiar link"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => zap(a.token)} className="cursor-pointer">
              <MessageCircle /> WhatsApp
            </Button>
            <a href={`/api/arte/${a.token}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center px-3 text-sm font-semibold text-indigo-600">
              Ver arte
            </a>
            {!a.resposta && (
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer text-rose-600"
                onClick={async () => {
                  const r = await excluirArte(a.id);
                  if (!r.ok) setErro(r.erro);
                  else carregar();
                }}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
