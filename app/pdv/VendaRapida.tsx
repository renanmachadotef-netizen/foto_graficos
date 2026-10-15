"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  History,
  Loader2,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizarBusca } from "@/lib/busca";
import {
  buscarClientes,
  cancelarPedido,
  carregarPedido,
  criarClienteRapido,
  listarPedidosAbertos,
  salvarVenda,
  type ClienteBusca,
  type ComprovanteVenda,
  type PedidoAberto,
} from "./actions";
import { PagamentoDialog } from "./PagamentoDialog";
import { ComprovanteDialog } from "./ComprovanteDialog";
import {
  arred,
  brl,
  emojiCategoria,
  paraNumero,
  qtdTexto,
  texto2,
  type ClienteEscolhido,
  type ItemCarrinho,
  type ProdutoPdv,
} from "./venda-tipos";

export type { ProdutoPdv } from "./venda-tipos";

let contador = 1;
const novaChave = () => `i${Date.now()}-${contador++}`;

export function VendaRapida({
  produtos,
  vendedores,
  vendedorInicial,
  empresa,
  cidade,
  pixSicoob,
  pixBradesco,
  pedidoInicial,
}: {
  produtos: ProdutoPdv[];
  vendedores: { id: string; name: string }[];
  vendedorInicial: string;
  empresa: string;
  cidade: string;
  pixSicoob: string | null;
  pixBradesco: string | null;
  pedidoInicial?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODAS");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [vendedorId, setVendedorId] = useState(vendedorInicial);
  const [desconto, setDesconto] = useState("");
  const [paraProducao, setParaProducao] = useState(true);
  const [pedido, setPedido] = useState<{ id: string; numero: number | null; jaPago: number; notes: string | null } | null>(null);

  const [editando, setEditando] = useState<{ item: ItemCarrinho | null; produto: ProdutoPdv | null } | null>(null);
  const [escolhendoCliente, setEscolhendoCliente] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [verPedidos, setVerPedidos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovanteVenda | null>(null);
  const [totalAbertos, setTotalAbertos] = useState<number | null>(null);
  const campoBusca = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listarPedidosAbertos().then((l) => setTotalAbertos(l.length));
  }, [comprovante]);

  // veio da tela Vendas do dia: abre o pedido escolhido
  useEffect(() => {
    if (pedidoInicial) continuarPedido(pedidoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* catalogo */
  const categorias = useMemo(() => {
    const m = new Map<string, number>();
    produtos.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [produtos]);

  const filtrados = useMemo(() => {
    const q = normalizarBusca(busca);
    const palavras = q.split(" ").filter(Boolean);
    const achados = produtos.filter((p) => {
      if (categoria !== "TODAS" && p.category !== categoria) return false;
      if (palavras.length === 0) return true;
      const alvo = normalizarBusca(p.name, p.code);
      return palavras.every((w) => alvo.includes(w));
    });
    if (palavras.length === 0) return achados;
    // relevancia: nome igual > comeca com o que digitou > palavra no comeco > contem
    const nota = (p: ProdutoPdv) => {
      const nome = normalizarBusca(p.name);
      if (nome === q) return 0;
      if (nome.startsWith(q)) return 1;
      if (palavras.every((w) => nome.split(" ").some((x) => x.startsWith(w)))) return 2;
      return 3;
    };
    return [...achados].sort((a, b) => nota(a) - nota(b) || a.name.length - b.name.length);
  }, [produtos, busca, categoria]);

  /* carrinho */
  const subtotal = arred(itens.reduce((s, i) => s + arred(i.quantity * i.unitPrice), 0));
  const descontoNum = Math.min(Math.max(arred(paraNumero(desconto)), 0), subtotal);
  const total = arred(subtotal - descontoNum);
  const jaPago = pedido?.jaPago ?? 0;
  const restante = arred(Math.max(0, total - jaPago));
  const qtdItens = itens.reduce((s, i) => s + (Number.isInteger(i.quantity) ? i.quantity : 1), 0);

  function adicionar(p: ProdutoPdv) {
    if (p.unit === "m") {
      setEditando({ item: null, produto: p });
      return;
    }
    setItens((cur) => {
      const igual = cur.find((i) => i.productId === p.id && !i.notes);
      if (igual) return cur.map((i) => (i === igual ? { ...i, quantity: i.quantity + 1 } : i));
      return [
        ...cur,
        { chave: novaChave(), productId: p.id, name: p.name, unit: p.unit, quantity: 1, unitPrice: p.price, unitCost: p.cost, notes: "" },
      ];
    });
  }

  function mudarQtd(chave: string, delta: number) {
    setItens((cur) =>
      cur
        .map((i) => (i.chave === chave ? { ...i, quantity: arred(i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function limpar() {
    setItens([]);
    setCliente(null);
    setDesconto("");
    setPedido(null);
    setErro(null);
    setParaProducao(true);
    setBusca("");
    setCategoria("TODAS");
    setTimeout(() => campoBusca.current?.focus(), 50);
  }

  function payload(fechar: boolean, pagamentos: { method: string; amount: number }[], vencimentoFiado?: string) {
    return {
      quoteId: pedido?.id ?? null,
      clientId: cliente?.id ?? null,
      sellerId: vendedorId,
      items: itens.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        notes: i.notes,
      })),
      discount: descontoNum,
      payments: pagamentos,
      fechar,
      paraProducao,
      vencimentoFiado,
      notes: pedido ? pedido.notes : undefined,
    };
  }

  async function finalizar(pagamentos: { method: string; amount: number }[], vencimentoFiado: string) {
    setSalvando(true);
    setErro(null);
    const r = await salvarVenda(payload(true, pagamentos, vencimentoFiado));
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setPagando(false);
    setComprovante(r.comprovante);
  }

  async function salvarComoPedido() {
    setSalvando(true);
    setErro(null);
    const r = await salvarVenda(payload(false, []));
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setComprovante(r.comprovante);
  }

  async function continuarPedido(id: string) {
    const p = await carregarPedido(id);
    if (!p) {
      setErro("Não consegui abrir esse pedido (talvez já tenha sido fechado).");
      return;
    }
    setItens(
      p.itens.map((i) => ({
        chave: novaChave(),
        productId: i.productId ?? null,
        name: i.name,
        unit: "un",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        notes: "",
      })),
    );
    setCliente(p.clienteNome === "Cliente Balcão" ? null : { id: p.clientId, name: p.clienteNome, phone: p.clienteTelefone, deve: 0, credito: 0 });
    setVendedorId(p.sellerId || vendedorInicial);
    setDesconto(p.desconto > 0 ? texto2(p.desconto) : "");
    setPedido({ id: p.id, numero: p.numero, jaPago: p.jaPago, notes: p.notes });
    setVerPedidos(false);
    setErro(null);
  }

  const carrinhoVazio = itens.length === 0;

  return (
    <div className="max-w-[1700px] min-w-0 mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="text-3xl font-semibold">Venda Rápida</h1>
          <p className="text-muted-foreground">
            {pedido ? `Continuando o pedido #${pedido.numero}` : "Toque no produto para colocar na venda."}
          </p>
        </div>
        <Link href="/vendas" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 font-semibold hover:bg-muted">
          <History className="size-5" /> Vendas do dia
        </Link>
        <Button variant="outline" size="lg" onClick={() => setVerPedidos(true)} className="cursor-pointer">
          <ClipboardList /> Pedidos em aberto{totalAbertos ? ` (${totalAbertos})` : ""}
        </Button>
        {!carrinhoVazio && (
          <Button variant="ghost" size="lg" onClick={limpar} className="cursor-pointer">
            <X /> Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_410px]">
        {/* Catalogo */}
        <section className="min-w-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              ref={campoBusca}
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && busca.trim() && filtrados[0]) {
                  adicionar(filtrados[0]);
                  setBusca("");
                }
              }}
              placeholder="Buscar produto pelo nome ou código…  (Enter coloca o primeiro)"
              className="pl-10 h-12 text-base"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip ativo={categoria === "TODAS"} onClick={() => setCategoria("TODAS")}>
              Todos ({produtos.length})
            </Chip>
            {categorias.map((c) => (
              <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
                {emojiCategoria(c)} {c}
              </Chip>
            ))}
          </div>

          {produtos.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
              Ainda não há produtos. Em <b>Administração → Trazer dados do NEX</b> você importa o catálogo.
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted-foreground space-y-3">
              <p>Nenhum produto com “{busca}”.</p>
              <Button variant="outline" onClick={() => setEditando({ item: null, produto: null })} className="cursor-pointer">
                <PackagePlus /> Colocar um item avulso
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filtrados.slice(0, 120).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => adicionar(p)}
                  className="text-left rounded-2xl border border-border bg-card p-3 shadow-xs hover:border-primary hover:shadow-md active:scale-[0.97] transition-all cursor-pointer flex flex-col gap-2 min-h-[104px]"
                >
                  <span className="font-semibold leading-snug line-clamp-2">{p.name}</span>
                  <span className="mt-auto flex items-baseline justify-between gap-2">
                    <span className="text-xl font-bold tabular-nums">{p.price > 0 ? brl(p.price) : "Sem preço"}</span>
                    <span className="text-xs text-muted-foreground">{p.unit === "un" ? "" : `/${p.unit}`}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {filtrados.length > 120 && <p className="text-sm text-muted-foreground">Mostrando 120 de {filtrados.length}. Digite na busca para achar mais rápido.</p>}
          {filtrados.length > 0 && (
            <Button variant="ghost" onClick={() => setEditando({ item: null, produto: null })} className="cursor-pointer">
              <PackagePlus /> Item avulso (digitar nome e valor)
            </Button>
          )}
        </section>

        {/* Carrinho */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col lg:max-h-[calc(100vh-7rem)]">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
                <h2 className="font-semibold text-lg">{pedido ? `Pedido #${pedido.numero}` : "Venda atual"}</h2>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-sm font-bold">{qtdTexto(qtdItens)}</span>
              </div>

              {pedido?.notes && <p className="rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2">📝 {pedido.notes}</p>}

              <button
                type="button"
                onClick={() => setEscolhendoCliente(true)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left flex items-center gap-2 hover:border-primary cursor-pointer"
              >
                <UserRound className="size-5 text-muted-foreground shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{cliente ? cliente.name : "Consumidor (balcão)"}</span>
                  {cliente && cliente.deve > 0 ? (
                    <span className="block text-sm text-rose-600 font-medium">Deve {brl(cliente.deve)} (fiado)</span>
                  ) : (
                    <span className="block text-sm text-muted-foreground">{cliente ? cliente.phone || "sem telefone" : "Toque para escolher o cliente"}</span>
                  )}
                </span>
                <Pencil className="size-4 text-muted-foreground" />
              </button>

              <div className="flex flex-wrap gap-1.5">
                {vendedores.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVendedorId(v.id)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium cursor-pointer ${
                      vendedorId === v.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                    }`}
                  >
                    {v.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
              {carrinhoVazio ? (
                <div className="py-10 text-center text-muted-foreground">
                  <ShoppingCart className="size-10 mx-auto opacity-40" />
                  <p className="mt-2">Nada na venda ainda.</p>
                </div>
              ) : (
                itens.map((i) => (
                  <div key={i.chave} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => setEditando({ item: i, produto: null })} className="min-w-0 flex-1 text-left cursor-pointer">
                        <p className="font-semibold leading-snug break-words">{i.name}</p>
                        {i.notes && <p className="text-sm text-muted-foreground">{i.notes}</p>}
                        <p className="text-sm text-muted-foreground">
                          {brl(i.unitPrice)}
                          {i.unit !== "un" ? `/${i.unit}` : ""} <Pencil className="inline size-3" />
                        </p>
                      </button>
                      <button type="button" aria-label="Tirar da venda" onClick={() => setItens((c) => c.filter((x) => x.chave !== i.chave))} className="text-rose-600 p-1 cursor-pointer">
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Diminuir" onClick={() => mudarQtd(i.chave, Number.isInteger(i.quantity) ? -1 : -0.5)} className="size-10 rounded-xl bg-muted flex items-center justify-center cursor-pointer active:scale-90">
                          <Minus className="size-5" />
                        </button>
                        <button type="button" onClick={() => setEditando({ item: i, produto: null })} className="min-w-12 text-center text-lg font-bold tabular-nums cursor-pointer">
                          {qtdTexto(i.quantity)}
                        </button>
                        <button type="button" aria-label="Aumentar" onClick={() => mudarQtd(i.chave, Number.isInteger(i.quantity) ? 1 : 0.5)} className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer active:scale-90">
                          <Plus className="size-5" />
                        </button>
                      </div>
                      <p className="text-lg font-bold tabular-nums">{brl(arred(i.quantity * i.unitPrice))}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="ml-auto tabular-nums">{brl(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Desconto (R$)</Label>
                <Input inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" className="ml-auto w-28 text-right" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={paraProducao} onChange={(e) => setParaProducao(e.target.checked)} className="size-4" />
                Precisa produzir (vai para a fila de produção)
              </label>
              <div className="flex items-end justify-between">
                <span className="text-muted-foreground font-medium">TOTAL</span>
                <span className="text-4xl font-bold tabular-nums">{brl(total)}</span>
              </div>
              {jaPago > 0 && (
                <p className="text-sm font-medium text-emerald-700">
                  Já pago {brl(jaPago)} • falta {brl(restante)}
                </p>
              )}
              {erro && <p className="rounded-xl bg-rose-100 text-rose-800 px-3 py-2 text-sm font-semibold">{erro}</p>}
              <Button
                size="lg"
                disabled={carrinhoVazio || salvando}
                onClick={() => {
                  setErro(null);
                  setPagando(true);
                }}
                className="w-full h-14 text-lg cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100"
              >
                <Wallet className="size-6" /> Cobrar {brl(restante || total)}
              </Button>
              <Button variant="outline" disabled={carrinhoVazio || salvando} onClick={salvarComoPedido} className="w-full cursor-pointer">
                {salvando ? <Loader2 className="animate-spin" /> : <Save />} Salvar como pedido em aberto
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {editando && (
        <EditarItem
          key={editando.item?.chave ?? editando.produto?.id ?? "avulso"}
          alvo={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(it) => {
            setItens((cur) => (cur.some((x) => x.chave === it.chave) ? cur.map((x) => (x.chave === it.chave ? it : x)) : [...cur, it]));
            setEditando(null);
          }}
        />
      )}

      {escolhendoCliente && (
        <EscolherCliente
          atual={cliente}
          onFechar={() => setEscolhendoCliente(false)}
          onEscolher={(c) => {
            setCliente(c);
            setEscolhendoCliente(false);
          }}
        />
      )}

      {pagando && (
        <PagamentoDialog
          total={total}
          jaPago={jaPago}
          numeroVenda={pedido?.numero ?? null}
          clienteBalcao={!cliente}
          empresa={empresa}
          cidade={cidade}
          pixSicoob={pixSicoob}
          pixBradesco={pixBradesco}
          salvando={salvando}
          erro={erro}
          onFechar={() => setPagando(false)}
          onConfirmar={finalizar}
        />
      )}

      {verPedidos && <PedidosAbertos onFechar={() => setVerPedidos(false)} onContinuar={continuarPedido} />}

      {comprovante && (
        <ComprovanteDialog
          c={comprovante}
          empresa={empresa}
          onNova={() => {
            setComprovante(null);
            limpar();
          }}
        />
      )}

      {/* barra fixa no celular */}
      {!carrinhoVazio && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{qtdTexto(qtdItens)} item(ns)</p>
            <p className="text-2xl font-bold tabular-nums">{brl(total)}</p>
          </div>
          <Button size="lg" onClick={() => setPagando(true)} className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100">
            <Wallet /> Cobrar
          </Button>
        </div>
      )}
      <div className="h-20 lg:hidden" />
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer ${
        ativo ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- item: quantidade, preco, observacao, medidas ---------- */

function EditarItem({
  alvo,
  onFechar,
  onSalvar,
}: {
  alvo: { item: ItemCarrinho | null; produto: ProdutoPdv | null };
  onFechar: () => void;
  onSalvar: (i: ItemCarrinho) => void;
}) {
  const base = alvo.item;
  const p = alvo.produto;
  const avulso = !base && !p;
  const unidade = base?.unit ?? p?.unit ?? "un";
  const porMetro = unidade === "m";

  const [nome, setNome] = useState(base?.name ?? p?.name ?? "");
  const [qtd, setQtd] = useState(base ? String(base.quantity).replace(".", ",") : "1");
  const [preco, setPreco] = useState(texto2(base?.unitPrice ?? p?.price ?? 0));
  const [obs, setObs] = useState(base?.notes ?? "");
  const [larg, setLarg] = useState("");
  const [alt, setAlt] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const area = arred(paraNumero(larg) * paraNumero(alt) * 1000) / 1000;
  useEffect(() => {
    if (porMetro && area > 0) setQtd(String(area).replace(".", ","));
  }, [area, porMetro]);

  function salvar() {
    const q = paraNumero(qtd);
    if (!nome.trim()) return setErro("Escreva o nome do item.");
    if (!(q > 0)) return setErro("A quantidade precisa ser maior que zero.");
    onSalvar({
      chave: base?.chave ?? novaChave(),
      productId: base?.productId ?? p?.id ?? null,
      name: nome.trim(),
      unit: unidade,
      quantity: q,
      unitPrice: arred(paraNumero(preco)),
      unitCost: base?.unitCost ?? p?.cost ?? 0,
      notes: porMetro && area > 0 && !obs ? `${larg.replace(".", ",")} x ${alt.replace(".", ",")} m` : obs,
    });
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-md max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">{avulso ? "Item avulso" : base ? "Ajustar item" : "Adicionar à venda"}</DialogTitle>
        <DialogDescription>{avulso ? "Para algo que não está no catálogo." : nome}</DialogDescription>
        <div className="space-y-4">
          {(avulso || base) && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Serviço de arte" autoFocus={avulso} />
            </div>
          )}

          {porMetro && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Medidas (em metros) — o sistema calcula os m²</p>
              <div className="grid grid-cols-2 gap-3">
                <Input inputMode="decimal" value={larg} onChange={(e) => setLarg(e.target.value)} placeholder="Largura (ex.: 1,20)" />
                <Input inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Altura (ex.: 0,80)" />
              </div>
              {area > 0 && <p className="text-sm text-muted-foreground">= {qtdTexto(area)} m²</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Quantidade{porMetro ? " (m²)" : ""}</Label>
              <Input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus={!avulso && !porMetro} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Preço{porMetro ? " por m²" : " cada"} (R$)</Label>
              <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Observação (opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: 50x30 cm, cor azul…" />
          </div>

          {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
          <Button size="lg" onClick={salvar} className="w-full cursor-pointer">
            <Plus /> {base ? "Salvar" : "Colocar na venda"} • {brl(arred(paraNumero(qtd) * paraNumero(preco)))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- cliente ---------- */

function EscolherCliente({
  atual,
  onFechar,
  onEscolher,
}: {
  atual: ClienteEscolhido | null;
  onFechar: () => void;
  onEscolher: (c: ClienteEscolhido | null) => void;
}) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<ClienteBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [novo, setNovo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [foneNovo, setFoneNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setLista([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      setLista(await buscarClientes(q));
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function criar() {
    setCriando(true);
    setErro(null);
    const r = await criarClienteRapido({ nome: nomeNovo, telefone: foneNovo });
    setCriando(false);
    if (!r.ok) return setErro(r.erro);
    onEscolher({ id: r.cliente.id, name: r.cliente.name, phone: r.cliente.phone, deve: 0, credito: 0 });
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-lg max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Quem está comprando?</DialogTitle>
        <DialogDescription>Procure pelo nome, telefone ou CPF/CNPJ.</DialogDescription>

        <Button variant={atual ? "outline" : "default"} onClick={() => onEscolher(null)} className="cursor-pointer justify-start">
          <UserRound /> Consumidor (sem cadastro)
        </Button>

        {!novo ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite pelo menos 2 letras…" className="pl-10" />
            </div>
            {buscando && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Procurando…
              </p>
            )}
            <ul className="space-y-2">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onEscolher({ id: c.id, name: c.name, phone: c.phone, deve: c.deve, credito: c.credito })}
                    className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary cursor-pointer"
                  >
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.phone || "sem telefone"}</p>
                    {c.deve > 0 && <p className="text-sm font-semibold text-rose-600">Deve {brl(c.deve)}</p>}
                    {c.credito > 0 && <p className="text-sm font-semibold text-emerald-700">Crédito {brl(c.credito)}</p>}
                  </button>
                </li>
              ))}
              {!buscando && q.trim().length >= 2 && lista.length === 0 && (
                <li className="text-muted-foreground text-sm">Ninguém com esse nome. Cadastre abaixo.</li>
              )}
            </ul>
            <Button variant="outline" onClick={() => { setNovo(true); setNomeNovo(q); }} className="cursor-pointer">
              <Plus /> Cadastrar cliente novo
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Telefone / WhatsApp (opcional)</Label>
              <Input inputMode="tel" value={foneNovo} onChange={(e) => setFoneNovo(e.target.value)} placeholder="48 99999-9999" />
            </div>
            {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setNovo(false)} className="cursor-pointer">
                Voltar
              </Button>
              <Button onClick={criar} disabled={criando} className="cursor-pointer">
                {criando ? <Loader2 className="animate-spin" /> : <Plus />} Cadastrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- pedidos em aberto ---------- */

function PedidosAbertos({ onFechar, onContinuar }: { onFechar: () => void; onContinuar: (id: string) => void }) {
  const [lista, setLista] = useState<PedidoAberto[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function carregar() {
    setLista(await listarPedidosAbertos());
  }
  useEffect(() => {
    carregar();
  }, []);

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Pedidos em aberto</DialogTitle>
        <DialogDescription>Pedidos salvos que ainda não foram pagos por inteiro. Toque em Continuar para cobrar ou mexer.</DialogDescription>
        {msg && <p className="rounded-xl bg-rose-100 text-rose-800 px-3 py-2 font-semibold">{msg}</p>}
        {!lista ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" /> Carregando…
          </p>
        ) : lista.length === 0 ? (
          <p className="rounded-xl bg-muted/60 p-6 text-center text-muted-foreground">Nenhum pedido em aberto. 🎉</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      #{p.numero} • {p.cliente}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.resumo}</p>
                    {p.notes && <p className="text-sm text-amber-800 font-medium">📝 {p.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(p.criado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums">{brl(p.total)}</p>
                    {p.jaPago > 0 && <p className="text-sm text-emerald-700">pago {brl(p.jaPago)}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => onContinuar(p.id)} className="cursor-pointer">
                    Continuar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!window.confirm(`Cancelar o pedido #${p.numero}?`)) return;
                      const r = await cancelarPedido(p.id);
                      if (!r.ok) setMsg(r.erro || "Não consegui cancelar.");
                      else {
                        setMsg(null);
                        carregar();
                      }
                    }}
                    className="cursor-pointer text-rose-600"
                  >
                    <Trash2 /> Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
