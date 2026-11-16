"use client";

import { useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { renomearCategoria } from "./actions";

/** Reduz a foto no proprio navegador (maior lado 800 px) antes de enviar, para a lista continuar leve. */
function reduzir(arq: File): Promise<Blob> {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(arq);
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? ok(b) : falha(new Error("x"))), "image/jpeg", 0.85);
    };
    img.onerror = () => falha(new Error("x"));
    img.src = url;
  });
}

export function FotoProduto({ produto, onMudou }: { produto: { id: string; temFoto: boolean }; onMudou: () => void }) {
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(arq: File) {
    setMsg("");
    setOcupado(true);
    try {
      const blob = await reduzir(arq);
      const fd = new FormData();
      fd.set("productId", produto.id);
      fd.set("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      const r = await (await fetch("/api/produto-foto", { method: "POST", body: fd })).json();
      if (!r.ok) setMsg(r.erro || "Nao foi possivel enviar.");
      else onMudou();
    } catch {
      setMsg("Nao consegui ler essa imagem.");
    }
    setOcupado(false);
  }

  async function tirar() {
    setOcupado(true);
    await fetch("/api/produto-foto?productId=" + produto.id, { method: "DELETE" });
    setOcupado(false);
    onMudou();
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
      {produto.temFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/produto-foto/${produto.id}?v=${Date.now()}`} alt="" className="size-16 rounded-lg object-cover bg-slate-100" />
      ) : (
        <div className="size-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
          <ImagePlus className="size-6" />
        </div>
      )}
      <div className="flex-1 space-y-1">
        <label className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold cursor-pointer hover:bg-slate-50">
          {ocupado ? "Enviando..." : produto.temFoto ? "Trocar foto" : "Adicionar foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={ocupado} onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
        </label>
        {produto.temFoto && (
          <button type="button" onClick={tirar} disabled={ocupado} className="ml-2 text-sm text-rose-600 font-semibold cursor-pointer">
            Tirar
          </button>
        )}
        {msg && <p className="text-xs text-red-600">{msg}</p>}
      </div>
    </div>
  );
}

export function GerenciarCategorias({ categorias, onFechar, onMudou }: { categorias: [string, number][]; onFechar: () => void; onMudou: () => void }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const [msg, setMsg] = useState("");
  const [pendente, iniciar] = useTransition();

  function gravar(de: string) {
    setMsg("");
    iniciar(async () => {
      const r = await renomearCategoria(de, novo);
      if (!r.ok) return setMsg(r.erro);
      setMsg(`${r.total} produto(s) passaram para "${novo.trim().toUpperCase()}".`);
      setEditando(null);
      onMudou();
    });
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>Troque o nome de uma categoria. Se o novo nome já existir, as duas se juntam.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-slate-100">
          {categorias.map(([c, n]) => (
            <div key={c} className="py-2 flex items-center gap-2">
              {editando === c ? (
                <>
                  <Input value={novo} onChange={(e) => setNovo(e.target.value)} className="flex-1" autoFocus />
                  <Button size="sm" disabled={pendente} onClick={() => gravar(c)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditando(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">
                    {c} <span className="text-xs text-slate-500">({n})</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(c);
                      setNovo(c);
                      setMsg("");
                    }}
                  >
                    Renomear
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {msg && <p className="text-sm font-medium text-slate-700">{msg}</p>}
      </DialogContent>
    </Dialog>
  );
}
