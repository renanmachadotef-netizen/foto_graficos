"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Boxes, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { salvarProduto, entradaEstoque, ajustarEstoque, historicoEstoque, type MovimentoLinha } from "./actions";

export interface ProdutoLinha {
  id: string;
  name: string;
  code: string | null;
  category: string;
  unit: string;
  price: number;
  cost: number;
  brand: string | null;
  description: string | null;
  active: boolean;
  trackStock: boolean;
  stockQty: number;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (t: string) => {
  const l = t.replace(/[^\d,.-]/g, "");
  if (!l) return 0;
  const n = Number(l.includes(",") ? l.replace(/\./g, "").replace(",", ".") : l);
  return Number.isFinite(n) ? n : 0;
};
const qtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }));
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const UNIDADES = [
  { v: "un", l: "unidade" },
  { v: "m2", l: "metro quadrado (m²)" },
  { v: "cento", l: "cento" },
  { v: "milheiro", l: "milheiro" },
  { v: "par", l: "par" },
  { v: "cx", l: "caixa" },
];

const ROTULO_MOVIMENTO: Record<string, string> = {
  initial: "Saldo inicial",
  sale: "Venda",
  cancel: "Cancelamento",
  entry: "Entrada",
  adjust: "Ajuste de contagem",
};

export function ProdutosView({ produtos, gestor }: { produtos: ProdutoLinha[]; gestor: boolean }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soEstoque, setSoEstoque] = useState(false);
  const [edicao, setEdicao] = useState<ProdutoLinha | "novo" | null>(null);
  const [estoqueDe, setEstoqueDe] = useState<ProdutoLinha | null>(null);

  const categorias = useMemo(() => {
    const m = new Map<string, number>();
    produtos.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [produtos]);

  const filtrados = useMemo(() => {
    const palavras = semAcento(busca).split(/\s+/).filter(Boolean);
    return produtos.filter((p) => {
      if (categoria && p.category !== categoria) return false;
      if (soEstoque && !p.trackStock) return false;
      if (palavras.length === 0) return true;
      const alvo = semAcento(`${p.name} ${p.code ?? ""} ${p.brand ?? ""}`);
      return palavras.every((w) => alvo.includes(w));
    });
  }, [produtos, busca, categoria, soEstoque]);

  const semCusto = produtos.filter((p) => p.active && p.cost <= 0).length;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Produtos</h1>
          <p className="text-muted-foreground">
            {produtos.length} cadastrados{semCusto > 0 && <> · <span className="text-amber-600 font-medium">{semCusto} sem custo</span></>}
          </p>
        </div>
        {gestor && (
          <Button onClick={() => setEdicao("novo")} className="gap-2">
            <Plus className="w-4 h-4" /> Novo produto
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código ou marca" className="pl-9" />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-card px-3 text-sm">
          <option value="">Todas as categorias</option>
          {categorias.map(([c, n]) => (
            <option key={c} value={c}>
              {c} ({n})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 px-2">
          <input type="checkbox" checked={soEstoque} onChange={(e) => setSoEstoque(e.target.checked)} /> Só com estoque
        </label>
      </div>

      <div className="bg-card border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtrados.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>}
        {filtrados.slice(0, 300).map((p) => (
          <div key={p.id} className={`p-3 flex items-center gap-3 ${p.active ? "" : "opacity-50"}`}>
            <button className="flex-1 text-left min-w-0" onClick={() => (gestor ? setEdicao(p) : setEstoqueDe(p))}>
              <p className="font-semibold text-slate-800 truncate">{p.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {p.category} · {p.unit === "m2" ? "por m²" : p.unit}
                {p.code ? ` · cód ${p.code}` : ""}
                {!p.active ? " · inativo" : ""}
              </p>
            </button>
            <div className="text-right text-sm shrink-0">
              <p className="font-bold text-slate-800">{brl(p.price)}</p>
              <p className={`text-xs ${p.cost > 0 ? "text-slate-500" : "text-amber-600"}`}>{p.cost > 0 ? `custo ${brl(p.cost)}` : "sem custo"}</p>
            </div>
            {p.trackStock && (
              <button
                onClick={() => setEstoqueDe(p)}
                className={`shrink-0 text-xs font-bold rounded-lg px-2.5 py-1.5 border flex items-center gap-1 ${p.stockQty <= 0 ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
              >
                {p.stockQty <= 0 && <AlertTriangle className="w-3 h-3" />}
                <Boxes className="w-3.5 h-3.5" /> {qtd(p.stockQty)}
              </button>
            )}
          </div>
        ))}
        {filtrados.length > 300 && <p className="p-3 text-center text-xs text-slate-500">Mostrando 300 de {filtrados.length}. Refine a busca.</p>}
      </div>

      {edicao && (
        <FormProduto
          key={edicao === "novo" ? "novo" : edicao.id}
          produto={edicao === "novo" ? null : edicao}
          categorias={categorias.map(([c]) => c)}
          onFechar={() => setEdicao(null)}
          onSalvo={() => {
            setEdicao(null);
            router.refresh();
          }}
        />
      )}
      {estoqueDe && <PainelEstoque produto={estoqueDe} gestor={gestor} onFechar={() => setEstoqueDe(null)} onMudou={() => router.refresh()} />}
    </div>
  );
}

function FormProduto({ produto, categorias, onFechar, onSalvo }: { produto: ProdutoLinha | null; categorias: string[]; onFechar: () => void; onSalvo: () => void }) {
  const [name, setName] = useState(produto?.name ?? "");
  const [code, setCode] = useState(produto?.code ?? "");
  const [category, setCategory] = useState(produto?.category ?? "OUTROS");
  const [unit, setUnit] = useState(produto?.unit ?? "un");
  const [price, setPrice] = useState(produto ? String(produto.price).replace(".", ",") : "");
  const [cost, setCost] = useState(produto ? String(produto.cost).replace(".", ",") : "");
  const [brand, setBrand] = useState(produto?.brand ?? "");
  const [description, setDescription] = useState(produto?.description ?? "");
  const [active, setActive] = useState(produto?.active ?? true);
  const [trackStock, setTrackStock] = useState(produto?.trackStock ?? false);
  const [stockQty, setStockQty] = useState("0");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const margem = num(price) > 0 && num(cost) > 0 ? ((num(price) - num(cost)) / num(price)) * 100 : null;

  function gravar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    iniciar(async () => {
      const r = await salvarProduto({
        id: produto?.id,
        name,
        code,
        category,
        unit,
        price: num(price),
        cost: num(cost),
        brand,
        description,
        active,
        trackStock,
        stockQty: num(stockQty),
      });
      if (!r.ok) setErro(r.erro);
      else onSalvo();
    });
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>Para produto vendido por metro quadrado, escolha a unidade m² e o preço do m²: a Venda Rápida pede largura e altura.</DialogDescription>
        </DialogHeader>
        <form onSubmit={gravar} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value.toUpperCase())} list="cats" />
              <datalist id="cats">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vendido por</Label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-card px-2 text-sm">
                {UNIDADES.map((u) => (
                  <option key={u.v} value={u.v}>
                    {u.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço {unit === "m2" ? "do m²" : ""}</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Custo {unit === "m2" ? "do m²" : "de 1 un"}</Label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          {margem != null && <p className="text-xs text-slate-500">Margem bruta: <strong>{margem.toFixed(0)}%</strong></p>}
          <div className="space-y-1">
            <Label className="text-xs">Marca / máquina</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observação</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-card px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo (aparece na Venda Rápida)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} /> Controlar estoque
            </label>
          </div>
          {trackStock && !produto?.trackStock && (
            <div className="space-y-1">
              <Label className="text-xs">Quantos tem agora na prateleira</Label>
              <Input value={stockQty} onChange={(e) => setStockQty(e.target.value)} inputMode="decimal" />
            </div>
          )}
          {erro && <p className="text-sm text-red-600 font-medium">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PainelEstoque({ produto, gestor, onFechar, onMudou }: { produto: ProdutoLinha; gestor: boolean; onFechar: () => void; onMudou: () => void }) {
  const [saldo, setSaldo] = useState(produto.stockQty);
  const [historico, setHistorico] = useState<MovimentoLinha[] | null>(null);
  const [aba, setAba] = useState<"entrada" | "ajuste">("entrada");
  const [q, setQ] = useState("");
  const [custo, setCusto] = useState("");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  async function carregar() {
    setHistorico(await historicoEstoque(produto.id));
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function gravar() {
    setErro("");
    iniciar(async () => {
      const r =
        aba === "entrada"
          ? await entradaEstoque(produto.id, num(q), custo.trim() ? num(custo) : null, nota)
          : await ajustarEstoque(produto.id, num(q), nota);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSaldo((s) => (aba === "entrada" ? Math.round((s + num(q)) * 1000) / 1000 : num(q)));
      setQ("");
      setCusto("");
      setNota("");
      await carregar();
      onMudou();
    });
  }

  if (!produto.trackStock) {
    return (
      <Dialog open onOpenChange={(a) => !a && onFechar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{produto.name}</DialogTitle>
            <DialogDescription>Este produto não controla estoque. Para ligar, edite o produto e marque “Controlar estoque”.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto.name}</DialogTitle>
          <DialogDescription>
            Estoque agora: <strong className="text-slate-900 text-base">{qtd(saldo)}</strong> {produto.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 text-sm">
          <button onClick={() => setAba("entrada")} className={`px-3 py-1.5 rounded-lg border font-semibold ${aba === "entrada" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200"}`}>
            Entrada de mercadoria
          </button>
          {gestor && (
            <button onClick={() => setAba("ajuste")} className={`px-3 py-1.5 rounded-lg border font-semibold ${aba === "ajuste" ? "bg-amber-50 border-amber-500 text-amber-700" : "border-slate-200"}`}>
              Ajuste de contagem
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{aba === "entrada" ? "Quantidade que chegou" : "Quanto tem na prateleira"}</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} inputMode="decimal" />
            </div>
            {aba === "entrada" && (
              <div className="space-y-1">
                <Label className="text-xs">Custo de 1 un (opcional)</Label>
                <Input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{aba === "entrada" ? "Observação (nota, fornecedor)" : "Motivo do ajuste *"}</Label>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
          {erro && <p className="text-sm text-red-600 font-medium">{erro}</p>}
          <Button onClick={gravar} disabled={pendente || !q.trim()} className="w-full">
            {pendente ? "Gravando..." : aba === "entrada" ? "Registrar entrada" : "Registrar ajuste"}
          </Button>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
            <History className="w-4 h-4" /> Histórico
          </p>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto text-sm">
            {historico === null && <p className="p-3 text-slate-500">Carregando...</p>}
            {historico?.length === 0 && <p className="p-3 text-slate-500">Nenhuma movimentação ainda.</p>}
            {historico?.map((m) => (
              <div key={m.id} className="p-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{ROTULO_MOVIMENTO[m.kind] ?? m.kind}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {new Date(m.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {m.quem ? ` · ${m.quem}` : ""}
                    {m.nota ? ` · ${m.nota}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${m.delta < 0 ? "text-red-600" : "text-emerald-600"}`}>{m.delta > 0 ? "+" : ""}{qtd(m.delta)}</p>
                  <p className="text-xs text-slate-500">saldo {qtd(m.depois)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
