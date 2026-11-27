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
import { ConfirmarDialog } from "@/components/confirmar-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizarBusca } from "@/lib/busca";
import { FORMAS_PAGAMENTO } from "@/lib/pagamentos";
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
  paraDecimal,
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
  maisVendidos,
  vendedores,
  vendedorInicial,
  empresa,
  cidade,
  pixSicoob,
  pixBradesco,
  pedidoInicial,
  limiteDesconto,
}: {
  produtos: ProdutoPdv[];
  maisVendidos: string[];
  vendedores: { id: string; name: string }[];
  vendedorInicial: string;
  empresa: string;
  cidade: string;
  pixSicoob: string | null;
  pixBradesco: string | null;
  pedidoInicial?: string | null;
  limiteDesconto: number | null;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODAS");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [vendedorId, setVendedorId] = useState(vendedorInicial);
  const [desconto, setDesconto] = useState("");
  const [descontoEmPct, setDescontoEmPct] = useState(false);
  const [descontoAberto, setDescontoAberto] = useState(false);
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  const [paraProducao, setParaProducao] = useState(true);
  const [prazo, setPrazo] = useState("");
  const [sinal, setSinal] = useState("");
  const [sinalForma, setSinalForma] = useState("CASH");
  const [pedido, setPedido] = useState<{ id: string; numero: number | null; jaPago: number; notes: string | null } | null>(null);

  const [editando, setEditando] = useState<{ item: ItemCarrinho | null; produto: ProdutoPdv | null } | null>(null);
  const [escolhendoCliente, setEscolhendoCliente] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [verPedidos, setVerPedidos] = useState(false);
  const [trocarPor, setTrocarPor] = useState<string | null>(null);
  const [redeIncerta, setRedeIncerta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovanteVenda | null>(null);
  const [comprovanteSoVer, setComprovanteSoVer] = useState(false);
  const [ultimoComprovante, setUltimoComprovante] = useState<ComprovanteVenda | null>(null);
  const [removido, setRemovido] = useState<{ item: ItemCarrinho; pos: number } | null>(null);
  const timerRemovido = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const descontoDigitado = descontoEmPct ? (subtotal * Math.min(Math.max(paraNumero(desconto), 0), 100)) / 100 : paraNumero(desconto);
  const descontoNum = Math.min(Math.max(arred(descontoDigitado), 0), subtotal);
  const descontoPct = subtotal > 0 ? (descontoNum / subtotal) * 100 : 0;
  const passouLimite = limiteDesconto !== null && descontoPct > limiteDesconto + 0.005;
  const total = arred(subtotal - descontoNum);
  // desconto que come a venda inteira (ou mais) não é cortado em silêncio: trava o Cobrar
  const descontoInvalido = subtotal > 0 && (descontoDigitado > subtotal + 0.005 || total <= 0);
  const bloqueado = passouLimite || descontoInvalido;
  const maisVendidosLista = useMemo(
    () => maisVendidos.map((id) => produtos.find((p) => p.id === id)).filter((p): p is ProdutoPdv => !!p),
    [maisVendidos, produtos],
  );

  function focarBusca() {
    // no celular o foco abriria o teclado a cada toque, entao so no computador
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => campoBusca.current?.focus(), 50);
    }
  }
  const jaPago = pedido?.jaPago ?? 0;
  const restante = arred(Math.max(0, total - jaPago));
  const qtdItens = itens.reduce((s, i) => s + (Number.isInteger(i.quantity) ? i.quantity : 1), 0);

  function adicionar(p: ProdutoPdv) {
    // sem preço no cadastro: pede o preço antes de colocar na venda (não entra a R$ 0,00)
    if (p.unit === "m" || p.unit === "m2" || !(p.price > 0)) {
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
    focarBusca();
  }

  function mudarQtd(chave: string, delta: number) {
    const atual = itens.find((i) => i.chave === chave);
    // chegar a zero é tirar o item: passa pelo "Desfazer"
    if (atual && arred(atual.quantity + delta) <= 0) return tirarItem(chave);
    setItens((cur) => cur.map((i) => (i.chave === chave ? { ...i, quantity: arred(i.quantity + delta) } : i)));
  }

  function limpar() {
    setItens([]);
    setCliente(null);
    setDesconto("");
    setDescontoEmPct(false);
    setConfirmaLimpar(false);
    setPedido(null);
    setPrazo("");
    setSinal("");
    setErro(null);
    setParaProducao(true);
    setBusca("");
    setCategoria("TODAS");
    setDescontoAberto(false);
    setRedeIncerta(false);
    // no celular/tablet o teclado não deve abrir sozinho ao começar outra venda
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => campoBusca.current?.focus(), 50);
    }
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
      prazo: prazo || undefined,
      notes: pedido ? pedido.notes : undefined,
    };
  }

  function tirarItem(chave: string) {
    const pos = itens.findIndex((x) => x.chave === chave);
    if (pos < 0) return;
    setRemovido({ item: itens[pos], pos });
    setItens((c) => c.filter((x) => x.chave !== chave));
    if (timerRemovido.current) clearTimeout(timerRemovido.current);
    timerRemovido.current = setTimeout(() => setRemovido(null), 6000);
  }

  function desfazerRemocao() {
    if (!removido) return;
    const { item, pos } = removido;
    setItens((c) => (c.some((x) => x.chave === item.chave) ? c : [...c.slice(0, pos), item, ...c.slice(pos)]));
    setRemovido(null);
    if (timerRemovido.current) clearTimeout(timerRemovido.current);
  }

  async function finalizar(pagamentos: { method: string; amount: number }[], vencimentoFiado: string) {
    setSalvando(true);
    setErro(null);
    let r: Awaited<ReturnType<typeof salvarVenda>>;
    try {
      r = await salvarVenda(payload(true, pagamentos, vencimentoFiado));
    } catch {
      setSalvando(false);
      setRedeIncerta(true); // a venda pode ter sido gravada: só libera de novo depois do operador conferir
      return setErro(MSG_SEM_REDE);
    }
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setRedeIncerta(false);
    setPagando(false);
    setComprovante(r.comprovante);
  }

  async function salvarComoPedido() {
    setSalvando(true);
    setErro(null);
    const valorSinal = arred(paraNumero(sinal));
    let r: Awaited<ReturnType<typeof salvarVenda>>;
    try {
      r = await salvarVenda(payload(false, valorSinal > 0 ? [{ method: sinalForma, amount: valorSinal }] : []));
    } catch {
      setSalvando(false);
      return setErro(MSG_SEM_REDE);
    }
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setComprovante(r.comprovante);
  }

  /** Se já há uma venda em andamento, pergunta antes de trocá-la pelo pedido escolhido. */
  function pedirContinuar(id: string) {
    if (itens.length > 0 && pedido?.id !== id) {
      setVerPedidos(false);
      setTrocarPor(id);
      return;
    }
    continuarPedido(id);
  }

  async function continuarPedido(id: string) {
    const p = await carregarPedido(id);
    if (!p) {
      setVerPedidos(false);
      setErro("Não consegui abrir esse pedido (talvez já tenha sido fechado).");
      return;
    }
    setItens(
      p.itens.map((i) => ({
        chave: novaChave(),
        productId: i.productId ?? null,
        name: i.name,
        unit: produtos.find((x) => x.id === i.productId)?.unit ?? "un",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        notes: "",
      })),
    );
    setDescontoEmPct(false);
    setCliente(p.clienteNome === "Cliente Balcão" ? null : { id: p.clientId, name: p.clienteNome, phone: p.clienteTelefone, deve: 0, credito: 0 });
    setVendedorId(p.sellerId || vendedorInicial);
    setDesconto(p.desconto > 0 ? texto2(p.desconto) : "");
    setPrazo(p.prazo ?? "");
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
        {ultimoComprovante && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => { setComprovanteSoVer(true); setComprovante(ultimoComprovante); }}
            className="cursor-pointer"
          >
            Último comprovante
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={() => setVerPedidos(true)} className="cursor-pointer">
          <ClipboardList /> Pedidos em aberto{totalAbertos ? ` (${totalAbertos})` : ""}
        </Button>
        {!carrinhoVazio &&
          (confirmaLimpar ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-1.5">
              <span className="text-sm font-semibold">Apagar a venda inteira?</span>
              <Button variant="destructive" onClick={limpar} className="cursor-pointer">
                Sim, apagar
              </Button>
              <Button variant="outline" onClick={() => setConfirmaLimpar(false)} className="cursor-pointer">
                Não
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="lg" onClick={() => setConfirmaLimpar(true)} className="cursor-pointer">
              <X /> Limpar
            </Button>
          ))}
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

          {maisVendidosLista.length > 0 && !busca.trim() && categoria === "TODAS" && (
            <div>
              <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">Mais vendidos</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {maisVendidosLista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => adicionar(p)}
                    className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-card p-2 text-left hover:border-primary active:bg-muted cursor-pointer"
                  >
                    {p.temFoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/produto-foto/${p.id}`} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{p.price > 0 ? brl(p.price) : "Sem preço"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 pr-8">
              <Chip ativo={categoria === "TODAS"} onClick={() => setCategoria("TODAS")}>
                Todos
              </Chip>
              {categorias.map((c) => (
                <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
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
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {filtrados.slice(0, 120).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => adicionar(p)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/60 active:bg-muted transition-colors cursor-pointer"
                >
                  {p.temFoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/produto-foto/${p.id}`} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      {(p.category || p.name).trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="block truncate font-medium">{p.name}</span>
                    {p.category && <span className="block truncate text-xs text-muted-foreground">{p.category}</span>}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">{p.unit === "un" ? "" : `/${p.unit}`}</span>
                  <span className="text-lg font-bold tabular-nums shrink-0">{p.price > 0 ? brl(p.price) : "Sem preço"}</span>
                  <Plus className="size-5 text-primary shrink-0" />
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
        <aside id="carrinho" className="scroll-mt-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col lg:max-h-[calc(100vh-7rem)]">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
                <h2 className="font-semibold text-lg">{pedido ? `Pedido #${pedido.numero}` : "Venda atual"}</h2>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-sm font-bold">{qtdTexto(qtdItens)}</span>
              </div>

              {pedido?.notes && <p className="rounded-lg bg-accent text-accent-foreground text-sm px-3 py-2">Recado: {pedido.notes}</p>}

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

              <div role="group" aria-label="Quem está vendendo" className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Vendedor:</span>
                {vendedores.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={vendedorId === v.id}
                    onClick={() => setVendedorId(v.id)}
                    className={`min-h-11 rounded-full border px-4 text-sm font-medium cursor-pointer ${
                      vendedorId === v.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                    }`}
                  >
                    {nomeCurto(v.name, vendedores)}
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
                      <button type="button" aria-label="Tirar da venda" onClick={() => tirarItem(i.chave)} className="text-rose-600 size-11 -mr-1 -mt-1 flex items-center justify-center rounded-xl hover:bg-muted cursor-pointer">
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Diminuir" onClick={() => mudarQtd(i.chave, Number.isInteger(i.quantity) ? -1 : -0.5)} className="size-11 rounded-xl bg-muted flex items-center justify-center cursor-pointer active:scale-90">
                          <Minus className="size-5" />
                        </button>
                        <button type="button" onClick={() => setEditando({ item: i, produto: null })} className="min-w-12 text-center text-lg font-bold tabular-nums cursor-pointer">
                          {qtdTexto(i.quantity)}
                        </button>
                        <button type="button" aria-label="Aumentar" onClick={() => mudarQtd(i.chave, Number.isInteger(i.quantity) ? 1 : 0.5)} className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer active:scale-90">
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
              {descontoNum > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="ml-auto tabular-nums">{brl(subtotal)}</span>
                </div>
              )}
              {descontoNum > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Desconto ({descontoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span>
                  <span className="ml-auto tabular-nums">− {brl(descontoNum)}</span>
                </div>
              )}
              <div className="flex items-end justify-between">
                <span className="text-muted-foreground font-medium">TOTAL</span>
                <span className="text-4xl font-bold tabular-nums">{brl(total)}</span>
              </div>
              {!descontoAberto && descontoNum === 0 && !carrinhoVazio && (
                <button
                  type="button"
                  onClick={() => setDescontoAberto(true)}
                  className="-mt-1 min-h-11 text-sm font-semibold text-foreground underline underline-offset-2 cursor-pointer"
                >
                  Dar desconto
                </button>
              )}
              {jaPago > 0 && (
                <p className="text-sm font-medium text-emerald-700">
                  Já pago {brl(jaPago)} • falta {brl(restante)}
                </p>
              )}
              {erro && <p className="rounded-xl bg-rose-100 text-rose-800 px-3 py-2 text-sm font-semibold">{erro}</p>}
              <Button
                size="lg"
                disabled={carrinhoVazio || salvando || bloqueado}
                onClick={() => {
                  setErro(null);
                  setPagando(true);
                }}
                className="w-full h-14 text-lg cursor-pointer bg-success text-success-foreground hover:bg-success hover:brightness-110"
              >
                <Wallet className="size-6" /> Cobrar {brl(restante || total)}
              </Button>
              {carrinhoVazio && <p className="text-center text-sm text-muted-foreground">Coloque um item na venda para cobrar.</p>}
              {passouLimite && (
                <p className="text-center text-sm font-semibold text-destructive">
                  Desconto acima do limite de {limiteDesconto?.toLocaleString("pt-BR")}%. Diminua o desconto ou chame o gerente.
                </p>
              )}
              {descontoInvalido && (
                <p role="alert" className="text-center text-sm font-semibold text-destructive">
                  O desconto ({brl(descontoDigitado)}) é igual ou maior que a venda ({brl(subtotal)}). Corrija o desconto para cobrar.
                </p>
              )}

              <details
                className="group rounded-xl border border-border"
                open={descontoAberto || descontoNum > 0}
                onToggle={(e) => setDescontoAberto(e.currentTarget.open)}
              >
                <summary className="flex cursor-pointer items-center justify-between px-3 py-3 text-sm font-semibold marker:content-none">
                  Desconto e produção
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="space-y-3 border-t border-border p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pdv-desconto" className="text-sm text-muted-foreground">
                      Desconto
                    </Label>
                    <Input
                      id="pdv-desconto"
                      inputMode="decimal"
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      placeholder="0,00"
                      className="ml-auto h-11 w-24 text-right"
                    />
                    <div className="flex overflow-hidden rounded-lg border border-input" role="group" aria-label="Desconto em reais ou em porcentagem">
                      {[
                        { pct: false, l: "R$" },
                        { pct: true, l: "%" },
                      ].map((o) => (
                        <button
                          key={o.l}
                          type="button"
                          aria-pressed={descontoEmPct === o.pct}
                          onClick={() => setDescontoEmPct(o.pct)}
                          className={`h-11 w-11 text-sm font-semibold cursor-pointer ${descontoEmPct === o.pct ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {limiteDesconto !== null && <p className="text-sm text-muted-foreground">Seu limite de desconto é {limiteDesconto.toLocaleString("pt-BR")}%.</p>}
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={paraProducao} onChange={(e) => setParaProducao(e.target.checked)} className="size-5" />
                    Enviar para a produção
                  </label>
                </div>
              </details>

              <details className="group rounded-xl border border-border">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-3 text-sm font-semibold marker:content-none">
                  Guardar como pedido (cliente paga depois)
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="space-y-3 border-t border-border p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pdv-prazo" className="text-sm text-muted-foreground">
                      Entregar até
                    </Label>
                    <Input id="pdv-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="ml-auto h-11 w-44" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pdv-sinal" className="text-sm text-muted-foreground">
                      Sinal (R$)
                    </Label>
                    <Input id="pdv-sinal" inputMode="decimal" value={sinal} onChange={(e) => setSinal(e.target.value)} placeholder="0,00" className="ml-auto h-11 w-24 text-right" />
                    <select
                      aria-label="Forma de pagamento do sinal"
                      value={sinalForma}
                      onChange={(e) => setSinalForma(e.target.value)}
                      className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f.v} value={f.v}>
                          {f.l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {cliente ? "O pedido fica guardado até o cliente pagar o resto." : "Escolha o cliente lá em cima para guardar o pedido."}
                  </p>
                  <Button variant="outline" disabled={carrinhoVazio || salvando || !cliente || descontoInvalido} onClick={salvarComoPedido} className="w-full h-11 cursor-pointer">
                    {salvando ? <Loader2 className="animate-spin" /> : <Save />} Salvar pedido em aberto
                  </Button>
                </div>
              </details>
            </div>
          </div>
        </aside>
      </div>

      {editando && (
        <EditarItem
          key={editando.item?.chave ?? editando.produto?.id ?? "avulso"}
          alvo={editando}
          precoCatalogo={editando.produto?.price ?? produtos.find((x) => x.id === editando.item?.productId)?.price ?? 0}
          limiteDesconto={limiteDesconto}
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
          incerto={redeIncerta}
          clienteNome={cliente?.name ?? null}
          clienteDeve={cliente?.deve ?? 0}
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

      {verPedidos && <PedidosAbertos onFechar={() => setVerPedidos(false)} onContinuar={pedirContinuar} />}

      <ConfirmarDialog
        aberto={trocarPor !== null}
        aoFechar={() => setTrocarPor(null)}
        titulo="Trocar a venda em andamento?"
        descricao="Você tem itens na venda atual. Se continuar o outro pedido, a venda atual será descartada."
        rotuloConfirmar="Trocar pelo pedido"
        perigo
        aoConfirmar={() => {
          const id = trocarPor;
          setTrocarPor(null);
          if (id) continuarPedido(id);
        }}
      />

      {comprovante && (
        <ComprovanteDialog
          c={comprovante}
          empresa={empresa}
          somenteVer={comprovanteSoVer}
          onNova={() => {
            setComprovante(null);
            setUltimoComprovante(comprovante);
            limpar();
          }}
          onFechar={() => {
            setComprovante(null);
            if (!comprovanteSoVer) {
              setUltimoComprovante(comprovante);
              limpar();
            }
            setComprovanteSoVer(false);
          }}
        />
      )}

      {removido && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg lg:bottom-6"
        >
          <span className="max-w-48 truncate">Tirou: {removido.item.name}</span>
          <button type="button" onClick={desfazerRemocao} className="h-11 cursor-pointer underline underline-offset-2">
            Desfazer
          </button>
        </div>
      )}

      {/* barra fixa no celular */}
      {!carrinhoVazio && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => document.getElementById("carrinho")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex-1 text-left cursor-pointer"
            aria-label="Ver os itens da venda"
          >
            <p className="text-sm text-muted-foreground underline underline-offset-2">Ver {qtdTexto(qtdItens)} item(ns)</p>
            <p className="text-2xl font-bold tabular-nums">{brl(restante || total)}</p>
            {jaPago > 0 && <p className="text-xs font-medium text-muted-foreground">Falta receber (já pago {brl(jaPago)})</p>}
            {passouLimite && <p className="text-xs font-semibold text-destructive">Desconto acima do limite</p>}
            {descontoInvalido && <p className="text-xs font-semibold text-destructive">Desconto maior que a venda</p>}
          </button>
          <Button
            size="lg"
            disabled={bloqueado}
            onClick={() => {
              setErro(null);
              setPagando(true);
            }}
            className="h-12 cursor-pointer bg-success text-success-foreground hover:bg-success hover:brightness-110"
          >
            <Wallet /> Cobrar
          </Button>
        </div>
      )}
      <div className="h-20 lg:hidden" />
    </div>
  );
}

const MSG_SEM_REDE =
  "Sem conexão com o sistema. Confira em Vendas do dia se esta venda foi gravada antes de tentar de novo, para não lançar duas vezes.";

/** Primeiro nome; se dois vendedores têm o mesmo, acrescenta a inicial do sobrenome. */
function nomeCurto(nome: string, todos: { name: string }[]) {
  const partes = nome.trim().split(/\s+/);
  const igual = todos.filter((x) => x.name.trim().split(/\s+/)[0] === partes[0]).length > 1;
  return igual && partes[1] ? `${partes[0]} ${partes[1][0]}.` : partes[0];
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
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
  precoCatalogo,
  limiteDesconto,
  onFechar,
  onSalvar,
}: {
  alvo: { item: ItemCarrinho | null; produto: ProdutoPdv | null };
  precoCatalogo: number;
  limiteDesconto: number | null;
  onFechar: () => void;
  onSalvar: (i: ItemCarrinho) => void;
}) {
  const base = alvo.item;
  const p = alvo.produto;
  const avulso = !base && !p;
  const unidade = base?.unit ?? p?.unit ?? "un";
  const porMetro = unidade === "m2"; // largura x altura = área
  const linear = unidade === "m"; // metro linear: digita só o comprimento

  const [nome, setNome] = useState(base?.name ?? p?.name ?? "");
  const [qtd, setQtd] = useState(base ? String(base.quantity).replace(".", ",") : "1");
  const [preco, setPreco] = useState(texto2(base?.unitPrice ?? p?.price ?? 0));
  const [obs, setObs] = useState(base?.notes ?? "");
  const [larg, setLarg] = useState(base?.larg ?? "");
  const [alt, setAlt] = useState(base?.alt ?? "");
  const [pecas, setPecas] = useState(base?.pecas ?? "1");
  const [erro, setErro] = useState<string | null>(null);
  const [precoConfirmado, setPrecoConfirmado] = useState(false);
  const semPreco = !base && !!p && !(p.price > 0); // produto sem preço no cadastro: o preço é o primeiro campo
  // em metros e medidas o ponto é decimal ("1.250" = 1,25); nas demais quantidades é milhar
  const numQtd = porMetro || linear ? paraDecimal : paraNumero;

  const nPecas = Math.max(1, Math.floor(paraNumero(pecas)) || 1);
  const larguraNum = paraDecimal(larg);
  const alturaNum = paraDecimal(alt);
  const area = arred(larguraNum * alturaNum * nPecas * 1000) / 1000;
  // medida que parece centímetro digitado no lugar de metro (ex.: 120 em vez de 1,20)
  const medidaSuspeita = larguraNum > 20 || alturaNum > 20;
  useEffect(() => {
    if (porMetro && area > 0) setQtd(String(area).replace(".", ","));
  }, [area, porMetro]);

  function salvar() {
    const q = numQtd(qtd);
    if (!nome.trim()) return setErro("Escreva o nome do item.");
    if (!(q > 0)) return setErro("A quantidade precisa ser maior que zero.");
    if (q > 9999) return setErro("Quantidade acima de 9.999. Confira se não digitou a mais.");
    if (porMetro && medidaSuspeita) return setErro("Medida acima de 20 m. As medidas são em metros: 1,20 e não 120.");
    const novoPreco = arred(paraNumero(preco));
    if (!(novoPreco > 0)) return setErro(novoPreco < 0 ? "O preço não pode ser negativo." : "Digite o preço do item. Ele não pode ficar em R$ 0,00.");
    if (novoPreco > 100000) return setErro("Preço acima de R$ 100.000,00. Confira se não digitou a mais.");
    // preço muito acima do normal: pede uma segunda confirmação (toque de novo em Salvar)
    const suspeito = precoCatalogo > 0 ? novoPreco > precoCatalogo * 3 : novoPreco > 10000;
    if (suspeito && !precoConfirmado) {
      setPrecoConfirmado(true);
      return setErro(
        precoCatalogo > 0
          ? `O preço ${brl(novoPreco)} é mais de 3 vezes o do cadastro (${brl(precoCatalogo)}). Se está certo, toque em Salvar de novo.`
          : `O preço ${brl(novoPreco)} é muito alto. Se está certo, toque em Salvar de novo.`,
      );
    }
    // o preço do item não pode furar o limite de desconto de quem não é gerente
    if (precoCatalogo > 0 && limiteDesconto !== null) {
      const minimo = arred(precoCatalogo * (1 - limiteDesconto / 100));
      if (novoPreco + 0.005 < minimo) {
        return setErro(`Preço abaixo do limite de desconto (${limiteDesconto.toLocaleString("pt-BR")}%). O mínimo é ${brl(minimo)}. Chame o gerente.`);
      }
    }
    const medidas = `${larg.replace(".", ",")} x ${alt.replace(".", ",")} m`;
    onSalvar({
      chave: base?.chave ?? novaChave(),
      productId: base?.productId ?? p?.id ?? null,
      name: nome.trim(),
      unit: unidade,
      quantity: q,
      unitPrice: arred(paraNumero(preco)),
      unitCost: base?.unitCost ?? p?.cost ?? 0,
      // observação vazia ou gerada pelas medidas antigas ("1,20 x 0,80 m") acompanha as medidas novas
      notes:
        porMetro && area > 0 && (!obs || /^(\d+ peças de )?[\d.,]* x [\d.,]* m$/.test(obs.trim()))
          ? nPecas > 1
            ? `${nPecas} peças de ${medidas}`
            : medidas
          : obs,
      larg,
      alt,
      pecas,
    });
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-md max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">{avulso ? "Item avulso" : base ? "Ajustar item" : "Adicionar à venda"}</DialogTitle>
        <DialogDescription>{avulso ? "Para algo que não está no catálogo." : nome}</DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {(avulso || base) && (
            <div className="space-y-1.5">
              <Label htmlFor="pdv-item-nome" className="text-sm font-semibold">Nome</Label>
              <Input id="pdv-item-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Serviço de arte" autoFocus={avulso} />
            </div>
          )}

          {porMetro && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Medidas em metros. O sistema calcula os m².</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pdv-larg" className="text-sm">Largura (m)</Label>
                  <Input id="pdv-larg" inputMode="decimal" value={larg} onChange={(e) => setLarg(e.target.value)} placeholder="1,20" autoFocus />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pdv-alt" className="text-sm">Altura (m)</Label>
                  <Input id="pdv-alt" inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="0,80" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pdv-pecas" className="text-sm">Peças</Label>
                  <Input id="pdv-pecas" inputMode="numeric" value={pecas} onChange={(e) => setPecas(e.target.value)} />
                </div>
              </div>
              {medidaSuspeita && (
                <p className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
                  Isso dá mais de 20 m. Era {larguraNum > 20 ? qtdTexto(larguraNum / 100) : qtdTexto(alturaNum / 100)} m?
                </p>
              )}
              {area > 0 && <p className="text-lg font-bold tabular-nums">= {qtdTexto(area)} m²</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pdv-item-qtd" className="text-sm font-semibold">Quantidade{porMetro ? " (m²)" : linear ? " (metros)" : ""}</Label>
              <Input id="pdv-item-qtd" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} onFocus={(e) => e.currentTarget.select()} autoFocus={!avulso && !porMetro && !semPreco} />
              {(porMetro || linear) && qtd.trim() && numQtd(qtd) > 0 && <p className="text-xs text-muted-foreground">Entendi: {qtdTexto(numQtd(qtd))}{porMetro ? " m²" : " m"}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdv-item-preco" className="text-sm font-semibold">Preço{porMetro ? " por m²" : linear ? " por metro" : " cada"} (R$)</Label>
              <Input
                id="pdv-item-preco"
                inputMode="decimal"
                value={preco}
                onChange={(e) => {
                  setPreco(e.target.value);
                  setPrecoConfirmado(false);
                }}
                onFocus={(e) => e.currentTarget.select()}
                autoFocus={semPreco && !porMetro}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pdv-item-obs" className="text-sm font-semibold">Observação (opcional)</Label>
            <Input id="pdv-item-obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: 50x30 cm, cor azul…" />
          </div>

          {erro && <p role="alert" className="text-rose-600 font-semibold">{erro}</p>}
          <Button size="lg" type="submit" className="w-full cursor-pointer">
            <Plus /> {base ? "Salvar" : "Colocar na venda"} • {brl(arred(numQtd(qtd) * paraNumero(preco)))}
          </Button>
        </form>
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
              <Label htmlFor="pdv-cli-nome" className="text-sm font-semibold">Nome</Label>
              <Input id="pdv-cli-nome" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdv-cli-fone" className="text-sm font-semibold">Telefone / WhatsApp (opcional)</Label>
              <Input id="pdv-cli-fone" inputMode="tel" value={foneNovo} onChange={(e) => setFoneNovo(e.target.value)} placeholder="48 99999-9999" />
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
  const [cancelando, setCancelando] = useState<PedidoAberto | null>(null);
  const [cancelErro, setCancelErro] = useState<string | null>(null);
  const [cancelPendente, setCancelPendente] = useState(false);

  async function confirmarCancelar() {
    if (!cancelando) return;
    setCancelPendente(true);
    const r = await cancelarPedido(cancelando.id);
    setCancelPendente(false);
    if (!r.ok) setCancelErro(r.erro || "Não consegui cancelar.");
    else {
      setCancelando(null);
      setMsg(null);
      carregar();
    }
  }

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
          <p className="rounded-xl bg-muted/60 p-6 text-center text-muted-foreground">Nenhum pedido em aberto.</p>
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
                    {p.notes && <p className="text-sm text-amber-800 font-medium">Recado: {p.notes}</p>}
                    <p className="text-sm text-muted-foreground">{new Date(p.criado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
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
                    onClick={() => { setCancelErro(null); setCancelando(p); }}
                    className="cursor-pointer text-rose-600"
                  >
                    <Trash2 /> Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ConfirmarDialog
          aberto={cancelando !== null}
          aoFechar={() => setCancelando(null)}
          titulo={`Cancelar o pedido #${cancelando?.numero ?? ""}?`}
          descricao={<>O pedido de <strong>{cancelando?.cliente}</strong> ({cancelando ? brl(cancelando.total) : ""}) será cancelado.</>}
          rotuloConfirmar="Sim, cancelar pedido"
          perigo
          pendente={cancelPendente}
          erro={cancelErro}
          aoConfirmar={confirmarCancelar}
        />
      </DialogContent>
    </Dialog>
  );
}
