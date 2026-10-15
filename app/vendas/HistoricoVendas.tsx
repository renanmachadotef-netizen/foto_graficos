"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Printer,
  Search,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelarVenda, listarVendas, type ResumoCaixa, type VendaLinha } from "./actions";
import type { ComprovanteVenda } from "../pdv/actions";
import { Recibo, whatsLink } from "../pdv/Recibo";
import { brl, qtdTexto } from "../pdv/venda-tipos";

type Papel = "ADMIN" | "MANAGER" | "SELLER";
type Filtro = "TODAS" | "PAGAS" | "FIADO" | "ABERTOS" | "CANCELADAS";

const dois = (n: number) => String(n).padStart(2, "0");
const ymdDe = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const somaDias = (ymd: string, n: number) => {
  const [a, m, d] = ymd.split("-").map(Number);
  return ymdDe(new Date(a, m - 1, d + n));
};
const diasEntre = (a: string, b: string) => {
  const [a1, m1, d1] = a.split("-").map(Number);
  const [a2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};
const dataLonga = (ymd: string) => {
  const [a, m, d] = ymd.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function situacao(v: VendaLinha): Filtro {
  if (v.status === "CANCELLED") return "CANCELADAS";
  if (v.status === "OPEN") return "ABERTOS";
  if (v.fiado > 0) return "FIADO";
  return "PAGAS";
}

export function HistoricoVendas({ papel, empresa }: { papel: Papel; empresa: string }) {
  const [de, setDe] = useState<string | null>(null);
  const [ate, setAte] = useState<string | null>(null);
  const [dados, setDados] = useState<{ vendas: VendaLinha[]; caixa: ResumoCaixa } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [busca, setBusca] = useState("");
  const [vendedor, setVendedor] = useState("TODOS");
  const [aberta, setAberta] = useState<VendaLinha | null>(null);

  useEffect(() => {
    const h = ymdDe(new Date());
    setDe(h);
    setAte(h);
  }, []);

  const carregar = useCallback(async () => {
    if (!de || !ate) return;
    setCarregando(true);
    setDados(await listarVendas(de, ate));
    setCarregando(false);
  }, [de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const hoje = ymdDe(new Date());
  const umDia = de !== null && de === ate;
  const multiDias = de !== null && ate !== null && de !== ate;

  function irPara(novoDe: string, novoAte: string) {
    setDe(novoDe);
    setAte(novoAte);
  }
  function mover(passo: number) {
    if (!de || !ate) return;
    const n = diasEntre(de, ate) + 1;
    irPara(somaDias(de, passo * n), somaDias(ate, passo * n));
  }

  const vendedores = useMemo(() => [...new Set((dados?.vendas ?? []).map((v) => v.vendedor).filter(Boolean) as string[])], [dados]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (dados?.vendas ?? []).filter((v) => {
      if (filtro !== "TODAS" && situacao(v) !== filtro) return false;
      if (vendedor !== "TODOS" && (v.vendedor ?? "—") !== vendedor) return false;
      if (!q) return true;
      return (
        String(v.numero ?? "").includes(q) ||
        v.clienteNome.toLowerCase().includes(q) ||
        v.itens.some((i) => i.nome.toLowerCase().includes(q))
      );
    });
  }, [dados, filtro, busca, vendedor]);

  const resumo = useMemo(() => {
    const vs = dados?.vendas ?? [];
    const fechadas = vs.filter((v) => v.status === "APPROVED");
    const abertas = vs.filter((v) => v.status === "OPEN");
    const vendido = fechadas.reduce((s, v) => s + v.total, 0);
    return {
      vendido,
      qtd: fechadas.length,
      ticket: fechadas.length ? vendido / fechadas.length : 0,
      abertosQtd: abertas.length,
      abertosFalta: abertas.reduce((s, v) => s + v.falta, 0),
      canceladas: vs.filter((v) => v.status === "CANCELLED").length,
      canceladasValor: vs.filter((v) => v.status === "CANCELLED").reduce((s, v) => s + v.total, 0),
    };
  }, [dados]);

  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { TODAS: 0, PAGAS: 0, FIADO: 0, ABERTOS: 0, CANCELADAS: 0 };
    (dados?.vendas ?? []).forEach((v) => {
      c.TODAS++;
      c[situacao(v)]++;
    });
    return c;
  }, [dados]);

  return (
    <div className="max-w-[1400px] min-w-0 mx-auto space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-semibold">Vendas do dia</h1>
          <p className="text-muted-foreground capitalize">{de ? (umDia ? dataLonga(de) : `${dataLonga(de)} até ${dataLonga(ate!)}`) : "Carregando…"}</p>
        </div>
        <Link href="/pdv" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
          <ShoppingBag className="size-5" /> Nova venda
        </Link>
      </div>

      {/* escolher o periodo */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Dia anterior" onClick={() => mover(-1)} className="cursor-pointer">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Próximo dia" onClick={() => mover(1)} disabled={!ate || ate >= hoje} className="cursor-pointer">
          <ChevronRight />
        </Button>
        <Chip ativo={umDia && de === hoje} onClick={() => irPara(hoje, hoje)}>Hoje</Chip>
        <Chip ativo={umDia && de === somaDias(hoje, -1)} onClick={() => irPara(somaDias(hoje, -1), somaDias(hoje, -1))}>Ontem</Chip>
        <Chip ativo={multiDias && ate === hoje && de === somaDias(hoje, -6)} onClick={() => irPara(somaDias(hoje, -6), hoje)}>7 dias</Chip>
        <Chip ativo={multiDias && ate === hoje && de === `${hoje.slice(0, 8)}01`} onClick={() => irPara(`${hoje.slice(0, 8)}01`, hoje)}>Este mês</Chip>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-10">
          <CalendarDays className="size-4 text-muted-foreground" />
          <input
            type="date"
            value={umDia && de ? de : ""}
            max={hoje}
            onChange={(e) => e.target.value && irPara(e.target.value, e.target.value)}
            className="bg-transparent outline-none"
            aria-label="Escolher o dia"
          />
        </label>
        {carregando && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {/* numeros */}
      <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.4fr)]">
        <Numero titulo="Vendido" valor={brl(resumo.vendido)} dica={`${resumo.qtd} venda(s)`} tom="text-emerald-700" />
        <Numero titulo="Ticket médio" valor={brl(resumo.ticket)} dica="por venda" />
        <Numero titulo="Em aberto" valor={brl(resumo.abertosFalta)} dica={`${resumo.abertosQtd} pedido(s) a receber`} tom="text-amber-700" />
        <Numero titulo="Canceladas" valor={String(resumo.canceladas)} dica={resumo.canceladas ? brl(resumo.canceladasValor) : "nenhuma"} tom={resumo.canceladas ? "text-rose-600" : ""} />
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Wallet className="size-4" /> Entrou no caixa
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{brl(dados?.caixa.entrouNoCaixa ?? 0)}</p>
          {dados && dados.caixa.porForma.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 text-sm">
              {dados.caixa.porForma.map((f) => (
                <li key={f.forma} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{f.forma}</span>
                  <span className="tabular-nums font-medium">{brl(f.valor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Nada recebido ainda.</p>
          )}
          {dados && (dados.caixa.fiadoRecebido > 0 || dados.caixa.fiadoNovo > 0) && (
            <p className="text-xs text-muted-foreground mt-1.5 border-t border-border pt-1.5">
              {dados.caixa.fiadoRecebido > 0 && `Fiado recebido: ${brl(dados.caixa.fiadoRecebido)}. `}
              {dados.caixa.fiadoNovo > 0 && `Vendido no fiado: ${brl(dados.caixa.fiadoNovo)}.`}
            </p>
          )}
        </div>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(["TODAS", "PAGAS", "FIADO", "ABERTOS", "CANCELADAS"] as Filtro[]).map((f) => (
          <Chip key={f} ativo={filtro === f} onClick={() => setFiltro(f)}>
            {{ TODAS: "Todas", PAGAS: "Pagas", FIADO: "Fiado", ABERTOS: "Em aberto", CANCELADAS: "Canceladas" }[f]} ({contagem[f]})
          </Chip>
        ))}
        {vendedores.length > 0 && (
          <select
            value={vendedor}
            onChange={(e) => setVendedor(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            aria-label="Filtrar por vendedor"
          >
            <option value="TODOS">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número, cliente ou produto…" className="pl-9" />
        </div>
      </div>

      {/* lista */}
      {!dados ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-5 animate-spin" /> Carregando as vendas…
        </p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
          {dados.vendas.length === 0 ? "Nenhuma venda nesse período." : "Nenhuma venda com esse filtro."}
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setAberta(v)}
                className={`w-full text-left rounded-2xl border bg-card p-3 sm:p-4 shadow-xs hover:border-primary hover:shadow-md transition-all cursor-pointer grid gap-2 sm:grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.6fr)_auto] sm:items-center ${
                  v.status === "CANCELLED" ? "opacity-60 border-rose-200" : "border-border"
                }`}
              >
                <div>
                  <p className="font-bold tabular-nums">#{v.numero ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{multiDias ? dataHora(v.criada) : hora(v.criada)}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{v.balcao ? "Consumidor (balcão)" : v.clienteNome}</p>
                  <p className="text-sm text-muted-foreground truncate">{v.vendedor ?? "sem vendedor"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm line-clamp-2">
                    {v.itens
                      .slice(0, 3)
                      .map((i) => `${qtdTexto(i.quantidade)}x ${i.nome}`)
                      .join(" • ")}
                    {v.itens.length > 3 ? ` • +${v.itens.length - 3}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {v.pagamentos
                      .filter((p) => p.situacao !== "CANCELLED")
                      .map((p, k) => (
                        <span key={k} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.forma === "Fiado" ? "bg-amber-100 text-amber-800" : "bg-muted text-foreground/80"}`}>
                          {p.forma}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className={`text-xl font-bold tabular-nums ${v.status === "CANCELLED" ? "line-through" : ""}`}>{brl(v.total)}</p>
                  <Selo v={v} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberta && (
        <Detalhe
          v={aberta}
          papel={papel}
          empresa={empresa}
          onFechar={() => setAberta(null)}
          onCancelada={() => {
            setAberta(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 h-10 text-sm font-semibold cursor-pointer ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function Numero({ titulo, valor, dica, tom = "" }: { titulo: string; valor: string; dica: string; tom?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-muted-foreground">{titulo}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${tom}`}>{valor}</p>
      <p className="text-sm text-muted-foreground">{dica}</p>
    </div>
  );
}

function Selo({ v }: { v: VendaLinha }) {
  const s = situacao(v);
  const estilo = {
    PAGAS: "bg-emerald-100 text-emerald-800",
    FIADO: "bg-amber-100 text-amber-800",
    ABERTOS: "bg-sky-100 text-sky-800",
    CANCELADAS: "bg-rose-100 text-rose-800",
    TODAS: "",
  }[s];
  const texto = { PAGAS: "Paga", FIADO: "Fiado", ABERTOS: "Em aberto", CANCELADAS: "Cancelada", TODAS: "" }[s];
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${estilo}`}>{texto}</span>;
}

function comprovanteDe(v: VendaLinha): ComprovanteVenda {
  const ativos = v.pagamentos.filter((p) => p.situacao !== "CANCELLED");
  const linhasTexto = v.itens.map((i) => `• ${qtdTexto(i.quantidade)}x ${i.nome} — ${brl(i.total)}`).join("\n");
  return {
    quoteId: v.id,
    numero: v.numero ?? 0,
    aberto: v.status === "OPEN",
    total: v.total,
    desconto: v.desconto,
    jaPago: 0,
    pago: v.pago,
    fiado: v.fiado,
    troco: 0,
    falta: v.falta,
    cliente: { nome: v.balcao ? "Cliente Balcão" : v.clienteNome, telefone: v.balcao ? null : v.clienteTelefone },
    vendedor: v.vendedor,
    data: v.criada,
    itens: v.itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade, unitario: i.unitario, total: i.total })),
    pagamentos: ativos.map((p) => ({ forma: p.forma, valor: p.valor })),
    whatsappTexto: `Olá! Segue o comprovante da sua ${v.status === "OPEN" ? "encomenda" : "compra"} #${v.numero}:\n\n${linhasTexto}\n\n*Total: ${brl(v.total)}*\n\nObrigado!`,
  };
}

function Detalhe({
  v,
  papel,
  empresa,
  onFechar,
  onCancelada,
}: {
  v: VendaLinha;
  papel: Papel;
  empresa: string;
  onFechar: () => void;
  onCancelada: () => void;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const comprovante = useMemo(() => comprovanteDe(v), [v]);
  const zap = whatsLink(comprovante);
  const gerente = papel === "ADMIN" || papel === "MANAGER";
  const podeCancelar = v.status !== "CANCELLED" && (gerente || (v.status === "OPEN" && v.pago === 0));

  async function confirmar() {
    setSalvando(true);
    setErro(null);
    const r = await cancelarVenda(v.id, motivo);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    if (r.aviso) {
      setAviso(r.aviso);
      setTimeout(onCancelada, 2500);
    } else onCancelada();
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-lg max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
          {v.status === "OPEN" ? "Pedido" : "Venda"} #{v.numero ?? "—"} <Selo v={v} />
        </DialogTitle>
        <DialogDescription>
          {dataHora(v.criada)} • {v.balcao ? "Consumidor (balcão)" : v.clienteNome} • {v.vendedor ?? "sem vendedor"}
        </DialogDescription>

        <div className="rounded-xl border border-border divide-y divide-border">
          {v.itens.map((i, k) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-2">
              <span className="min-w-0 break-words">
                {qtdTexto(i.quantidade)}x {i.nome}
                <span className="block text-xs text-muted-foreground">{brl(i.unitario)} cada</span>
              </span>
              <span className="font-semibold tabular-nums">{brl(i.total)}</span>
            </div>
          ))}
          {v.desconto > 0 && (
            <div className="flex justify-between px-3 py-2 text-muted-foreground">
              <span>Desconto</span>
              <span>-{brl(v.desconto)}</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-2 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{brl(v.total)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-sm">Pagamentos</p>
          {v.pagamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            v.pagamentos.map((p, k) => (
              <div key={k} className={`flex justify-between text-sm ${p.situacao === "CANCELLED" ? "line-through text-muted-foreground" : ""}`}>
                <span>
                  {p.forma}
                  {p.situacao === "PENDING" && <span className="text-amber-700 font-medium"> • a receber</span>}
                  {p.situacao === "CANCELLED" && " • cancelado"}
                </span>
                <span className="tabular-nums font-medium">{brl(p.valor)}</span>
              </div>
            ))
          )}
          {v.status === "OPEN" && v.falta > 0 && <p className="text-sm font-semibold text-amber-700">Falta receber {brl(v.falta)}</p>}
        </div>

        {v.notes && <p className="rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2">📝 {v.notes}</p>}

        {v.cancelada && (
          <p className="rounded-lg bg-rose-50 text-rose-800 text-sm px-3 py-2">
            <b>Cancelada</b> em {dataHora(v.cancelada.em)}
            {v.cancelada.por ? ` por ${v.cancelada.por}` : ""}
            {v.cancelada.motivo ? `. Motivo: ${v.cancelada.motivo}` : ""}
          </p>
        )}

        {aviso && <p className="rounded-lg bg-amber-100 text-amber-900 font-semibold px-3 py-2">{aviso}</p>}

        {v.status !== "CANCELLED" && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.print()} className="cursor-pointer">
              <Printer /> Imprimir
            </Button>
            <Button variant="outline" disabled={!zap} onClick={() => zap && window.open(zap, "_blank", "noopener")} className="cursor-pointer">
              <MessageCircle /> {zap ? "WhatsApp" : "Sem fone"}
            </Button>
          </div>
        )}

        {v.status === "OPEN" && (
          <Link href={`/pdv?pedido=${v.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
            Abrir na Venda Rápida para cobrar
          </Link>
        )}

        {podeCancelar &&
          (cancelando ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
              <p className="font-semibold text-rose-800">Por que está cancelando?</p>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu, lancei errado…" autoFocus />
              {erro && <p className="text-rose-700 font-semibold text-sm">{erro}</p>}
              <p className="text-xs text-rose-800/80">A venda não é apagada: fica no histórico como cancelada, e os valores saem do caixa.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { setCancelando(false); setErro(null); }} className="cursor-pointer">
                  Voltar
                </Button>
                <Button variant="destructive" onClick={confirmar} disabled={salvando} className="cursor-pointer">
                  {salvando ? <Loader2 className="animate-spin" /> : <Ban />} Cancelar venda
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setCancelando(true)} className="cursor-pointer text-rose-600">
              <Ban /> Cancelar {v.status === "OPEN" ? "pedido" : "venda"}
            </Button>
          ))}

        {!podeCancelar && v.status !== "CANCELLED" && (
          <p className="text-xs text-muted-foreground">Para cancelar uma venda já paga, chame o gerente ou o administrador.</p>
        )}

        <Recibo c={comprovante} empresa={empresa} />
      </DialogContent>
    </Dialog>
  );
}
