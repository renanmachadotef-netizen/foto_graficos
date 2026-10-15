"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Loader2, MessageCircle, Search, Undo2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { desfazerRecebimento, receberConta } from "./actions";
import { FORMAS_PAGAMENTO, rotuloPagamento } from "@/lib/pagamentos";

export interface ContaReceber {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate: string | null;
  status: "PENDING" | "PAID";
  fiadoAntigo: boolean;
  category: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  forma: string | null;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dois = (n: number) => String(n).padStart(2, "0");
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
};
const diasEntre = (a: string, b: string) => {
  const [a1, m1, d1] = a.split("-").map(Number);
  const [a2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};
const dataCurta = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase());

function telefoneWhats(tel: string | null): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

type ColunaId = "antigo" | "late" | "week" | "later" | "paid";

const COLUNAS: { id: ColunaId; titulo: string; dica: string; barra: string; fundo: string }[] = [
  { id: "antigo", titulo: "Fiado antigo", dica: "Saldo que veio do NEX", barra: "bg-violet-500", fundo: "bg-violet-50" },
  { id: "late", titulo: "Atrasadas", dica: "Já passou do vencimento", barra: "bg-rose-500", fundo: "bg-rose-50" },
  { id: "week", titulo: "Vence em 7 dias", dica: "Hoje e próximos dias", barra: "bg-amber-400", fundo: "bg-amber-50" },
  { id: "later", titulo: "Mais pra frente", dica: "Ainda tem tempo", barra: "bg-slate-400", fundo: "bg-slate-100" },
  { id: "paid", titulo: "Recebidas", dica: "Fiado recebido nos últimos 30 dias", barra: "bg-emerald-500", fundo: "bg-emerald-50" },
];

function colunaDe(c: ContaReceber, hoje: string): ColunaId {
  if (c.status === "PAID") return "paid";
  if (c.fiadoAntigo) return "antigo";
  const d = diasEntre(hoje, c.dueDate);
  if (d < 0) return "late";
  if (d <= 7) return "week";
  return "later";
}

const campo =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReceberClientView({ contas, empresa, pix }: { contas: ContaReceber[]; empresa: string; pix: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hoje, setHoje] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [recebendo, setRecebendo] = useState<ContaReceber | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => setHoje(hojeLocal()), []);

  const atualizar = () => startTransition(() => router.refresh());
  const avisar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(null), 3500);
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? contas.filter((c) => c.clienteNome.toLowerCase().includes(q)) : contas;
  }, [contas, busca]);

  const grupos = useMemo(() => {
    const g: Record<ColunaId, ContaReceber[]> = { antigo: [], late: [], week: [], later: [], paid: [] };
    if (!hoje) return g;
    for (const c of filtradas) g[colunaDe(c, hoje)].push(c);
    // maiores dividas primeiro nas colunas abertas
    (["antigo", "late", "week", "later"] as ColunaId[]).forEach((k) => g[k].sort((a, b) => b.amount - a.amount));
    g.paid.sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""));
    return g;
  }, [filtradas, hoje]);

  const soma = (l: ContaReceber[]) => l.reduce((s, c) => s + c.amount, 0);
  const aberto = soma(grupos.antigo) + soma(grupos.late) + soma(grupos.week) + soma(grupos.later);
  const clientesDevendo = new Set(
    filtradas.filter((c) => c.status === "PENDING").map((c) => c.clienteNome),
  ).size;

  function cobrar(c: ContaReceber) {
    const fone = telefoneWhats(c.clienteTelefone);
    if (!fone) return;
    const msg =
      `Olá, ${primeiroNome(c.clienteNome)}! Tudo bem? Aqui é da ${empresa}. ` +
      `Passando para lembrar que consta em aberto o valor de ${brl(c.amount)} (${c.description.replace(/\s*\(.*?\)\s*$/, "")}). ` +
      (pix ? `Se preferir, pode pagar por PIX: ${pix}. ` : "") +
      `Qualquer dúvida é só responder por aqui. Obrigado!`;
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  return (
    <div className="max-w-[1600px] min-w-0 mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contas a Receber</h1>
          <p className="text-muted-foreground mt-1">Quem está devendo para a loja. Toque em “Cobrar” para chamar no WhatsApp e em “Recebi” quando pagarem.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente…" className="pl-10" />
        </div>
      </div>

      {aviso && (
        <div className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-5" /> {aviso}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Resumo titulo="Total a receber" valor={brl(aberto)} dica={`${clientesDevendo} cliente(s)`} tom="text-amber-600" />
        <Resumo titulo="Fiado antigo (NEX)" valor={brl(soma(grupos.antigo))} dica={`${grupos.antigo.length} cliente(s)`} />
        <Resumo titulo="Atrasado" valor={brl(soma(grupos.late))} dica={`${grupos.late.length} conta(s)`} tom={soma(grupos.late) > 0 ? "text-rose-600" : ""} />
        <Resumo titulo="Recebido (30 dias)" valor={brl(soma(grupos.paid))} dica={`${grupos.paid.length} recebimento(s)`} tom="text-emerald-600" />
      </div>

      {!hoje ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-5 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:snap-none">
          {COLUNAS.map((col) => {
            const lista = grupos[col.id];
            if (lista.length === 0 && (col.id === "antigo" || col.id === "later")) return null;
            return (
              <section key={col.id} className={`snap-start shrink-0 w-[300px] sm:w-[320px] rounded-2xl border border-border p-3 flex flex-col gap-3 ${col.fundo}`}>
                <header className="px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full ${col.barra}`} />
                    <h2 className="font-semibold text-lg">{col.titulo}</h2>
                    <span className="ml-auto rounded-full bg-card px-2.5 py-0.5 text-sm font-bold">{lista.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{col.dica}</p>
                  {lista.length > 0 && <p className="text-sm font-semibold mt-1">{brl(soma(lista))}</p>}
                </header>

                {lista.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                    {col.id === "paid" ? "Nenhum recebimento ainda." : "Nada por aqui. 🎉"}
                  </div>
                ) : (
                  lista.slice(0, col.id === "paid" ? 50 : 200).map((c) => (
                    <Cartao
                      key={c.id}
                      conta={c}
                      hoje={hoje}
                      onCobrar={() => cobrar(c)}
                      onReceber={() => setRecebendo(c)}
                      onDesfazer={async () => {
                        const r = await desfazerRecebimento(c.id);
                        if (r.ok) {
                          avisar("Recebimento desfeito.");
                          atualizar();
                        }
                      }}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}

      {recebendo && (
        <Receber
          conta={recebendo}
          onFechar={() => setRecebendo(null)}
          onRecebido={() => {
            setRecebendo(null);
            avisar("Recebimento registrado! ✅");
            atualizar();
          }}
        />
      )}
    </div>
  );
}

function Resumo({ titulo, valor, dica, tom = "" }: { titulo: string; valor: string; dica: string; tom?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-muted-foreground">{titulo}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${tom}`}>{valor}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{dica}</p>
    </div>
  );
}

function Cartao({
  conta,
  hoje,
  onCobrar,
  onReceber,
  onDesfazer,
}: {
  conta: ContaReceber;
  hoje: string;
  onCobrar: () => void;
  onReceber: () => void;
  onDesfazer: () => void;
}) {
  const pago = conta.status === "PAID";
  const diff = diasEntre(hoje, conta.dueDate);
  const temWhats = !!telefoneWhats(conta.clienteTelefone);

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
      <div>
        <p className="font-semibold text-base leading-snug break-words flex items-start gap-2">
          <Wallet className="size-5 mt-0.5 shrink-0 text-muted-foreground" /> {conta.clienteNome}
        </p>
        <p className="text-sm text-muted-foreground break-words">{conta.description}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{brl(conta.amount)}</p>
      <p
        className={`text-sm font-semibold flex items-center gap-1.5 ${
          pago ? "text-emerald-600" : conta.fiadoAntigo ? "text-violet-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground"
        }`}
      >
        {pago ? <Check className="size-4" /> : diff < 0 && !conta.fiadoAntigo ? <AlertTriangle className="size-4" /> : <CalendarClock className="size-4" />}
        {pago
          ? `Recebido em ${dataCurta(conta.paymentDate || conta.dueDate)}${conta.forma ? ` • ${rotuloPagamento(conta.forma)}` : ""}`
          : conta.fiadoAntigo
            ? "Saldo antigo, sem data"
            : diff < 0
              ? `Venceu há ${-diff} ${-diff === 1 ? "dia" : "dias"} (${dataCurta(conta.dueDate)})`
              : diff === 0
                ? "Vence hoje"
                : `Vence em ${diff} dias (${dataCurta(conta.dueDate)})`}
      </p>

      {pago ? (
        <Button variant="outline" onClick={onDesfazer} className="cursor-pointer">
          <Undo2 /> Desfazer
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={onCobrar}
            disabled={!temWhats}
            title={temWhats ? "Chamar no WhatsApp" : "Cliente sem telefone válido"}
            className="cursor-pointer"
          >
            <MessageCircle /> {temWhats ? "Cobrar" : "Sem fone"}
          </Button>
          <Button onClick={onReceber} className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100">
            <Check /> Recebi
          </Button>
        </div>
      )}
    </article>
  );
}

function Receber({ conta, onFechar, onRecebido }: { conta: ContaReceber; onFechar: () => void; onRecebido: () => void }) {
  const [valor, setValor] = useState(conta.amount.toFixed(2).replace(".", ","));
  const [quando, setQuando] = useState(hojeLocal());
  const [forma, setForma] = useState("PIX_SICOOB");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function numero(t: string) {
    const l = t.replace(/[^\d,.-]/g, "");
    const n = Number(l.includes(",") ? l.replace(/\./g, "").replace(",", ".") : l);
    return Number.isFinite(n) ? n : 0;
  }
  const v = numero(valor);
  const parcial = v > 0 && v < conta.amount - 0.005;

  async function confirmar() {
    if (v <= 0) {
      setErro("Informe quanto o cliente pagou.");
      return;
    }
    setSalvando(true);
    const r = await receberConta(conta.id, { valor: v, data: quando, forma });
    setSalvando(false);
    if (r.ok) onRecebido();
    else setErro(r.erro);
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-xl font-semibold">Registrar recebimento</DialogTitle>
        <DialogDescription>
          {conta.clienteNome} deve {brl(conta.amount)}.
        </DialogDescription>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Quanto o cliente pagou? (R$)</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            {parcial && (
              <p className="text-sm text-amber-700 font-medium">
                Pagamento parcial: continua devendo {brl(Math.round((conta.amount - v) * 100) / 100)}.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Recebido em</Label>
              <input type="date" className={campo} value={quando} onChange={(e) => setQuando(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Forma</Label>
              <select className={campo} value={forma} onChange={(e) => setForma(e.target.value)}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.v} value={f.v}>
                    {f.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
          <Button size="lg" onClick={confirmar} disabled={salvando} className="w-full cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100">
            {salvando ? <Loader2 className="animate-spin" /> : <Check />} Confirmar recebimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
