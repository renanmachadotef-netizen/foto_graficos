"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Repeat,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  apagarArquivo,
  apagarConta,
  apagarContaFixa,
  criarConta,
  pagarConta,
  reabrirConta,
  salvarConta,
  salvarContaFixa,
} from "./actions";
import { formatarLinha } from "@/lib/boleto";

export interface ArquivoConta {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface ContaCard {
  id: string;
  description: string;
  supplier: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate: string | null;
  status: "PENDING" | "PAID";
  category: string | null;
  barcode: string | null;
  notes: string | null;
  needsReview: boolean;
  fixa: boolean;
  files: ArquivoConta[];
}

export interface ContaFixa {
  id: string;
  name: string;
  dueDay: number;
  expectedAmount: number;
  category: string | null;
  notes: string | null;
}

const CATEGORIAS: { nome: string; emoji: string }[] = [
  { nome: "Energia", emoji: "💡" },
  { nome: "Água", emoji: "💧" },
  { nome: "Internet/Telefone", emoji: "📶" },
  { nome: "Aluguel", emoji: "🏠" },
  { nome: "Fornecedores", emoji: "📦" },
  { nome: "Impostos", emoji: "🏛️" },
  { nome: "Funcionários", emoji: "👥" },
  { nome: "Contador", emoji: "🧾" },
  { nome: "Manutenção", emoji: "🔧" },
  { nome: "Marketing", emoji: "📣" },
  { nome: "Outros", emoji: "📌" },
];

const FORMAS = [
  { v: "PIX", l: "PIX" },
  { v: "BOLETO", l: "Boleto" },
  { v: "CARD_DEBIT", l: "Cartão de débito" },
  { v: "CARD_CREDIT", l: "Cartão de crédito" },
  { v: "CASH", l: "Dinheiro" },
  { v: "TRANSFER", l: "Transferência" },
  { v: "OTHER", l: "Outro" },
];

const ATALHOS_FIXAS: { nome: string; categoria: string }[] = [
  { nome: "Energia 1", categoria: "Energia" },
  { nome: "Energia 2", categoria: "Energia" },
  { nome: "Energia 3", categoria: "Energia" },
  { nome: "Energia 4", categoria: "Energia" },
  { nome: "Água", categoria: "Água" },
  { nome: "Internet", categoria: "Internet/Telefone" },
  { nome: "Telefone", categoria: "Internet/Telefone" },
  { nome: "Aluguel", categoria: "Aluguel" },
  { nome: "Contador", categoria: "Contador" },
  { nome: "Simples Nacional (DAS)", categoria: "Impostos" },
];

const emojiDe = (cat: string | null) => CATEGORIAS.find((c) => c.nome === cat)?.emoji ?? "📌";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function paraNumero(txt: string): number {
  const limpo = txt.replace(/[^\d,.-]/g, "");
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  return Number.isFinite(n) ? n : 0;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

function diasEntre(deYmd: string, ateYmd: string): number {
  const [a1, m1, d1] = deYmd.split("-").map(Number);
  const [a2, m2, d2] = ateYmd.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

const dataCurta = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

function textoVencimento(diff: number, ymd: string): string {
  if (diff < 0) return `Venceu há ${-diff} ${-diff === 1 ? "dia" : "dias"} (${dataCurta(ymd)})`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return `Vence amanhã (${dataCurta(ymd)})`;
  return `Vence em ${diff} dias (${dataCurta(ymd)})`;
}

type ColunaId = "review" | "late" | "today" | "week" | "later" | "paid";

const COLUNAS: { id: ColunaId; titulo: string; dica: string; barra: string; fundo: string }[] = [
  { id: "review", titulo: "Para conferir", dica: "Chegou por envio. Confira e confirme.", barra: "bg-sky-500", fundo: "bg-sky-50" },
  { id: "late", titulo: "Atrasadas", dica: "Já passou do vencimento", barra: "bg-rose-500", fundo: "bg-rose-50" },
  { id: "today", titulo: "Vence hoje", dica: "Pagar hoje", barra: "bg-orange-500", fundo: "bg-orange-50" },
  { id: "week", titulo: "Próximos 7 dias", dica: "Vence essa semana", barra: "bg-amber-400", fundo: "bg-amber-50" },
  { id: "later", titulo: "Mais pra frente", dica: "Ainda tem tempo", barra: "bg-slate-400", fundo: "bg-slate-100" },
  { id: "paid", titulo: "Pagas", dica: "Últimos 30 dias", barra: "bg-emerald-500", fundo: "bg-emerald-50" },
];

function colunaDe(c: ContaCard, hoje: string): ColunaId {
  if (c.status === "PAID") return "paid";
  if (c.needsReview) return "review";
  const d = diasEntre(hoje, c.dueDate);
  if (d < 0) return "late";
  if (d === 0) return "today";
  if (d <= 7) return "week";
  return "later";
}

const campo =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ContasClientView({ contas, fixas }: { contas: ContaCard[]; fixas: ContaFixa[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hoje, setHoje] = useState<string | null>(null);
  const [editando, setEditando] = useState<ContaCard | "nova" | null>(null);
  const [pagando, setPagando] = useState<ContaCard | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [gerindoFixas, setGerindoFixas] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<ColunaId | null>(null);

  useEffect(() => setHoje(hojeLocal()), []);

  function atualizar() {
    startTransition(() => router.refresh());
  }

  function mostrarAviso(t: string) {
    setAviso(t);
    setTimeout(() => setAviso(null), 3500);
  }

  const grupos = useMemo(() => {
    const g: Record<ColunaId, ContaCard[]> = { review: [], late: [], today: [], week: [], later: [], paid: [] };
    if (!hoje) return g;
    for (const c of contas) g[colunaDe(c, hoje)].push(c);
    g.paid.sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""));
    return g;
  }, [contas, hoje]);

  const soma = (l: ContaCard[]) => l.reduce((s, c) => s + c.amount, 0);
  const emAtraso = soma(grupos.late);
  const proximos = soma(grupos.today) + soma(grupos.week);
  const emAberto = soma(grupos.review) + soma(grupos.late) + soma(grupos.today) + soma(grupos.week) + soma(grupos.later);
  const pagas = soma(grupos.paid);

  async function soltarEm(coluna: ColunaId) {
    const id = arrastando;
    setArrastando(null);
    setSobre(null);
    const c = contas.find((x) => x.id === id);
    if (!c) return;
    if (coluna === "paid" && c.status !== "PAID") setPagando(c);
    else if (coluna !== "paid" && c.status === "PAID") {
      const r = await reabrirConta(c.id);
      if (r.ok) {
        mostrarAviso("Conta reaberta.");
        atualizar();
      }
    }
  }

  return (
    <div className="max-w-[1600px] min-w-0 mx-auto space-y-6">
      {/* Cabecalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contas a Pagar</h1>
          <p className="text-muted-foreground mt-1">Tudo o que vence, num lugar só. Arraste uma conta para “Pagas” quando pagar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setEditando("nova")} className="cursor-pointer">
            <Plus /> Nova conta
          </Button>
          <Button size="lg" variant="outline" onClick={() => setEnviando(true)} className="cursor-pointer">
            <Upload /> Enviar boletos
          </Button>
          <Button size="lg" variant="outline" onClick={() => setGerindoFixas(true)} className="cursor-pointer">
            <Repeat /> Contas fixas
          </Button>
        </div>
      </div>

      {aviso && (
        <div className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-5" /> {aviso}
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Resumo titulo="Em atraso" valor={brl(emAtraso)} tom={emAtraso > 0 ? "text-rose-600" : ""} dica={`${grupos.late.length} conta(s)`} />
        <Resumo titulo="Vence em 7 dias" valor={brl(proximos)} tom="text-amber-600" dica={`${grupos.today.length + grupos.week.length} conta(s)`} />
        <Resumo titulo="Total em aberto" valor={brl(emAberto)} dica="Tudo que ainda falta pagar" />
        <Resumo titulo="Pago (30 dias)" valor={brl(pagas)} tom="text-emerald-600" dica={`${grupos.paid.length} conta(s)`} />
      </div>

      {/* Quadro */}
      {!hoje ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-5 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:snap-none">
          {COLUNAS.map((col) => {
            const lista = grupos[col.id];
            if (col.id === "review" && lista.length === 0) return null;
            return (
              <section
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSobre(col.id);
                }}
                onDragLeave={() => setSobre((s) => (s === col.id ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarEm(col.id);
                }}
                className={`snap-start shrink-0 w-[300px] sm:w-[320px] rounded-2xl border border-border p-3 flex flex-col gap-3 transition-colors ${col.fundo} ${
                  sobre === col.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <header className="px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full ${col.barra}`} />
                    <h2 className="font-semibold text-lg">{col.titulo}</h2>
                    <span className="ml-auto rounded-full bg-card px-2.5 py-0.5 text-sm font-bold">{lista.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{col.dica}</p>
                  {lista.length > 0 && col.id !== "paid" && (
                    <p className="text-sm font-semibold mt-1">{brl(soma(lista))}</p>
                  )}
                </header>

                {lista.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                    {col.id === "paid" ? "Nenhuma conta paga ainda." : "Nada por aqui. 🎉"}
                  </div>
                ) : (
                  lista.map((c) => (
                    <Cartao
                      key={c.id}
                      conta={c}
                      hoje={hoje}
                      coluna={col.id}
                      onAbrir={() => setEditando(c)}
                      onPagar={() => setPagando(c)}
                      onDesfazer={async () => {
                        const r = await reabrirConta(c.id);
                        if (r.ok) {
                          mostrarAviso("Conta reaberta.");
                          atualizar();
                        }
                      }}
                      onCopiado={() => mostrarAviso("Código do boleto copiado!")}
                      onArrastar={(on) => setArrastando(on ? c.id : null)}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}

      {editando && (
        <EditarConta
          key={editando === "nova" ? "nova" : editando.id}
          conta={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={(msg) => {
            setEditando(null);
            mostrarAviso(msg);
            atualizar();
          }}
        />
      )}

      {pagando && (
        <PagarConta
          conta={pagando}
          onFechar={() => setPagando(null)}
          onPago={() => {
            setPagando(null);
            mostrarAviso("Conta paga! ✅");
            atualizar();
          }}
        />
      )}

      {enviando && (
        <EnviarBoletos
          onFechar={() => {
            setEnviando(false);
            atualizar();
          }}
        />
      )}

      {gerindoFixas && (
        <ContasFixas
          fixas={fixas}
          onFechar={() => setGerindoFixas(false)}
          onMudou={() => atualizar()}
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
  coluna,
  onAbrir,
  onPagar,
  onDesfazer,
  onCopiado,
  onArrastar,
}: {
  conta: ContaCard;
  hoje: string;
  coluna: ColunaId;
  onAbrir: () => void;
  onPagar: () => void;
  onDesfazer: () => void;
  onCopiado: () => void;
  onArrastar: (on: boolean) => void;
}) {
  const diff = diasEntre(hoje, conta.dueDate);
  const pago = conta.status === "PAID";
  const semValor = conta.amount === 0;
  const titulo = conta.supplier || conta.description;

  async function copiar() {
    if (!conta.barcode) return;
    try {
      await navigator.clipboard.writeText(conta.barcode);
      onCopiado();
    } catch {
      window.prompt("Copie o código:", conta.barcode);
    }
  }

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", conta.id);
        e.dataTransfer.effectAllowed = "move";
        onArrastar(true);
      }}
      onDragEnd={() => onArrastar(false)}
      className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3 cursor-grab active:cursor-grabbing"
    >
      <button type="button" onClick={onAbrir} className="text-left cursor-pointer">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none mt-0.5">{emojiDe(conta.category)}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base leading-snug break-words">{titulo}</p>
            {conta.supplier && conta.description !== conta.supplier && (
              <p className="text-sm text-muted-foreground break-words">{conta.description}</p>
            )}
          </div>
          {conta.fixa && (
            <span title="Conta fixa (repete todo mês)" className="text-muted-foreground">
              <Repeat className="size-4" />
            </span>
          )}
        </div>
        <p className={`text-2xl font-bold mt-2 tabular-nums ${semValor && !pago ? "text-amber-600 text-lg" : ""}`}>
          {semValor && !pago ? "Informar o valor" : brl(conta.amount)}
        </p>
        <p
          className={`text-sm font-semibold mt-1 flex items-center gap-1.5 ${
            pago ? "text-emerald-600" : diff < 0 ? "text-rose-600" : diff === 0 ? "text-orange-600" : "text-muted-foreground"
          }`}
        >
          {pago ? <Check className="size-4" /> : diff < 0 ? <AlertTriangle className="size-4" /> : <CalendarClock className="size-4" />}
          {pago ? `Paga em ${dataCurta(conta.paymentDate || conta.dueDate)}` : textoVencimento(diff, conta.dueDate)}
        </p>
      </button>

      {(conta.files.length > 0 || conta.barcode) && (
        <div className="flex flex-wrap gap-2">
          {conta.files.length > 0 && (
            <a
              href={`/api/contas/arquivo/${conta.files[0].id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Paperclip className="size-4" /> Ver boleto
            </a>
          )}
          {conta.barcode && !pago && (
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer"
            >
              <Copy className="size-4" /> Copiar código
            </button>
          )}
        </div>
      )}

      {pago ? (
        <Button variant="outline" onClick={onDesfazer} className="cursor-pointer">
          <Undo2 /> Desfazer
        </Button>
      ) : coluna === "review" ? (
        <Button onClick={onAbrir} className="cursor-pointer">
          <Check /> Conferir e confirmar
        </Button>
      ) : (
        <Button onClick={onPagar} className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100">
          <Check /> Paguei
        </Button>
      )}
    </article>
  );
}

/* ---------- Pagar ---------- */

function PagarConta({ conta, onFechar, onPago }: { conta: ContaCard; onFechar: () => void; onPago: () => void }) {
  const [valor, setValor] = useState(conta.amount ? conta.amount.toFixed(2).replace(".", ",") : "");
  const [quando, setQuando] = useState(hojeLocal());
  const [forma, setForma] = useState("PIX");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    const v = paraNumero(valor);
    if (v <= 0) {
      setErro("Informe quanto você pagou.");
      return;
    }
    setSalvando(true);
    const r = await pagarConta(conta.id, { valor: v, data: quando, forma });
    setSalvando(false);
    if (r.ok) onPago();
    else setErro(r.erro);
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-xl font-semibold">Marcar como paga</DialogTitle>
        <DialogDescription>{conta.supplier || conta.description}</DialogDescription>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Quanto você pagou? (R$)</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Pago em</Label>
              <input type="date" className={campo} value={quando} onChange={(e) => setQuando(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Forma</Label>
              <select className={campo} value={forma} onChange={(e) => setForma(e.target.value)}>
                {FORMAS.map((f) => (
                  <option key={f.v} value={f.v}>
                    {f.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
          <Button size="lg" onClick={confirmar} disabled={salvando} className="w-full cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100">
            {salvando ? <Loader2 className="animate-spin" /> : <Check />} Confirmar pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Criar / editar ---------- */

function EditarConta({
  conta,
  onFechar,
  onSalvo,
}: {
  conta: ContaCard | null;
  onFechar: () => void;
  onSalvo: (msg: string) => void;
}) {
  const [nome, setNome] = useState(conta?.description ?? "");
  const [fornecedor, setFornecedor] = useState(conta?.supplier ?? "");
  const [valor, setValor] = useState(conta && conta.amount ? conta.amount.toFixed(2).replace(".", ",") : "");
  const [venc, setVenc] = useState(conta?.dueDate ?? hojeLocal());
  const [categoria, setCategoria] = useState(conta?.category ?? "");
  const [linha, setLinha] = useState(conta?.barcode ? formatarLinha(conta.barcode) : "");
  const [obs, setObs] = useState(conta?.notes ?? "");
  const [arquivos, setArquivos] = useState<ArquivoConta[]>(conta?.files ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmaApagar, setConfirmaApagar] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [anexando, setAnexando] = useState(false);

  const revisando = !!conta?.needsReview;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const dados = {
      description: nome,
      supplier: fornecedor,
      amount: paraNumero(valor),
      dueDate: venc,
      category: categoria || null,
      barcode: linha,
      notes: obs,
    };
    const r = conta ? await salvarConta(conta.id, dados) : await criarConta(dados);
    setSalvando(false);
    if (r.ok) onSalvo(conta ? (revisando ? "Conta confirmada! ✅" : "Conta salva.") : "Conta criada! ✅");
    else setErro(r.erro);
  }

  async function apagar() {
    if (!conta) return;
    setSalvando(true);
    const r = await apagarConta(conta.id);
    setSalvando(false);
    if (r.ok) onSalvo("Conta apagada.");
    else setErro(r.erro);
  }

  async function anexar(f: File) {
    if (!conta) return;
    setAnexando(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("transactionId", conta.id);
    try {
      const r = await fetch("/api/contas/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (j.ok) setArquivos((a) => [...a, { id: j.fileId, name: f.name, mime: f.type, size: f.size }]);
      else setErro(j.erro || "Não consegui anexar.");
    } catch {
      setErro("Não consegui anexar o arquivo.");
    }
    setAnexando(false);
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">
          {conta ? (revisando ? "Conferir conta" : "Editar conta") : "Nova conta"}
        </DialogTitle>
        <DialogDescription>
          {revisando
            ? "O sistema leu o boleto. Confira se está tudo certo e toque em Confirmar."
            : "Preencha o que você sabe. Só o nome e o vencimento são obrigatórios."}
        </DialogDescription>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Que conta é essa?</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Conta de energia, Aluguel…" autoFocus={!conta} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Para quem você paga? (opcional)</Label>
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: RGE, Casan, Fornecedor X" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Valor (R$)</Label>
              <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Vence em</Label>
              <input type="date" className={campo} value={venc} onChange={(e) => setVenc(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.nome}
                  type="button"
                  onClick={() => setCategoria(categoria === c.nome ? "" : c.nome)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                    categoria === c.nome ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  {c.emoji} {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Código do boleto (opcional)</Label>
            <Input value={linha} onChange={(e) => setLinha(e.target.value)} placeholder="Linha digitável (47 ou 48 números)" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Observação (opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          {conta && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Boleto / comprovante</Label>
              {arquivos.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <a href={`/api/contas/arquivo/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {a.name}
                  </a>
                  <button
                    type="button"
                    aria-label="Remover arquivo"
                    className="text-rose-600 cursor-pointer"
                    onClick={async () => {
                      const r = await apagarArquivo(a.id);
                      if (r.ok) setArquivos((x) => x.filter((y) => y.id !== a.id));
                    }}
                  >
                    <X className="size-5" />
                  </button>
                </div>
              ))}
              <input
                ref={inputArquivo}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) anexar(f);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" onClick={() => inputArquivo.current?.click()} disabled={anexando} className="cursor-pointer">
                {anexando ? <Loader2 className="animate-spin" /> : <Paperclip />} Anexar PDF ou foto
              </Button>
            </div>
          )}

          {erro && <p className="text-rose-600 font-semibold">{erro}</p>}

          <div className="flex flex-col gap-2 pt-1">
            <Button size="lg" onClick={salvar} disabled={salvando} className="w-full cursor-pointer">
              {salvando ? <Loader2 className="animate-spin" /> : <Check />}
              {revisando ? "Confirmar conta" : conta ? "Salvar" : "Criar conta"}
            </Button>
            {conta &&
              (confirmaApagar ? (
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={apagar} disabled={salvando} className="flex-1 cursor-pointer">
                    <Trash2 /> Sim, apagar
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmaApagar(false)} className="flex-1 cursor-pointer">
                    Não
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmaApagar(true)} className="cursor-pointer text-rose-600">
                  <Trash2 /> Apagar esta conta
                </Button>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Enviar boletos ---------- */

interface ItemEnvio {
  nome: string;
  estado: "lendo" | "ok" | "repetido" | "erro";
  texto?: string;
}

function EnviarBoletos({ onFechar }: { onFechar: () => void }) {
  const [itens, setItens] = useState<ItemEnvio[]>([]);
  const [sobre, setSobre] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const ocupado = itens.some((i) => i.estado === "lendo");

  async function processar(arquivos: File[]) {
    const base = itens.length;
    setItens((x) => [...x, ...arquivos.map((f) => ({ nome: f.name, estado: "lendo" as const }))]);
    for (let i = 0; i < arquivos.length; i++) {
      const f = arquivos[i];
      const idx = base + i;
      const fd = new FormData();
      fd.append("file", f);
      let novo: ItemEnvio;
      try {
        const r = await fetch("/api/contas/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!j.ok) novo = { nome: f.name, estado: "erro", texto: j.erro || "Não consegui ler." };
        else if (j.duplicado) novo = { nome: f.name, estado: "repetido", texto: `Esse boleto já estava cadastrado (${j.descricao}).` };
        else {
          const d = j.dados || {};
          if (d.origem === "nenhuma") {
            novo = {
              nome: f.name,
              estado: "repetido",
              texto: `Guardei o arquivo, mas não consegui ler os dados sozinho${d.aviso ? ` (${d.aviso})` : ""}. Preencha na hora de conferir.`,
            };
            setItens((x) => x.map((it, k) => (k === idx ? novo : it)));
            continue;
          }
          const partes = [
            d.fornecedor || d.descricao || "Conta",
            d.valor ? brl(d.valor) : "valor não encontrado",
            d.vencimento ? `vence ${d.vencimento.slice(8, 10)}/${d.vencimento.slice(5, 7)}` : "vencimento não encontrado",
          ];
          novo = { nome: f.name, estado: "ok", texto: partes.join(" · ") };
        }
      } catch {
        novo = { nome: f.name, estado: "erro", texto: "Falha de conexão." };
      }
      setItens((x) => x.map((it, k) => (k === idx ? novo : it)));
    }
  }

  function escolhidos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    processar(Array.from(lista));
  }

  return (
    <Dialog open onOpenChange={(a) => !a && !ocupado && onFechar()}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Enviar boletos</DialogTitle>
        <DialogDescription>
          Envie o PDF ou a foto do boleto. O sistema lê o valor e o vencimento e coloca em “Para conferir”.
        </DialogDescription>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSobre(false);
            escolhidos(e.dataTransfer.files);
          }}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            sobre ? "border-primary bg-accent" : "border-border bg-muted/40"
          }`}
        >
          <Upload className="size-10 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">Arraste os arquivos aqui</p>
          <p className="text-sm text-muted-foreground">PDF, JPG ou PNG • até 10 MB cada • pode enviar vários</p>
          <input ref={entrada} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => { escolhidos(e.target.files); e.target.value = ""; }} />
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { escolhidos(e.target.files); e.target.value = ""; }} />
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button size="lg" onClick={() => entrada.current?.click()} className="cursor-pointer">
              <FileText /> Escolher arquivos
            </Button>
            <Button size="lg" variant="outline" onClick={() => camera.current?.click()} className="cursor-pointer">
              <Camera /> Tirar foto
            </Button>
          </div>
        </div>

        {itens.length > 0 && (
          <ul className="space-y-2">
            {itens.map((it, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="mt-0.5">
                  {it.estado === "lendo" && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
                  {it.estado === "ok" && <CheckCircle2 className="size-5 text-emerald-600" />}
                  {it.estado === "repetido" && <AlertTriangle className="size-5 text-amber-600" />}
                  {it.estado === "erro" && <X className="size-5 text-rose-600" />}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{it.nome}</p>
                  <p className="text-sm text-muted-foreground">{it.estado === "lendo" ? "Lendo o boleto…" : it.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button size="lg" onClick={onFechar} disabled={ocupado} className="w-full cursor-pointer">
          {itens.some((i) => i.estado === "ok") ? "Pronto! Ver e conferir" : "Fechar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Contas fixas ---------- */

function ContasFixas({ fixas, onFechar, onMudou }: { fixas: ContaFixa[]; onFechar: () => void; onMudou: () => void }) {
  const [nome, setNome] = useState("");
  const [dia, setDia] = useState("10");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    setSalvando(true);
    setErro(null);
    const r = await salvarContaFixa({
      name: nome,
      dueDay: Number(dia),
      expectedAmount: paraNumero(valor),
      category: categoria || null,
    });
    setSalvando(false);
    if (r.ok) {
      setNome("");
      setValor("");
      setCategoria("");
      onMudou();
    } else setErro(r.erro);
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Contas fixas</DialogTitle>
        <DialogDescription>
          Contas que chegam todo mês (energia, água, aluguel…). O sistema cria o lembrete sozinho, todo mês, no dia certo.
        </DialogDescription>

        {fixas.length === 0 ? (
          <p className="rounded-xl bg-muted/60 p-4 text-muted-foreground">Você ainda não cadastrou nenhuma conta fixa.</p>
        ) : (
          <ul className="space-y-2">
            {fixas.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-xl">{emojiDe(f.category)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{f.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Todo dia {f.dueDay} • {f.expectedAmount > 0 ? brl(f.expectedAmount) : "valor muda todo mês"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Apagar ${f.name}`}
                  className="text-rose-600 cursor-pointer p-1"
                  onClick={async () => {
                    if (!window.confirm(`Parar de lembrar de “${f.name}”? Os lembretes futuros não pagos serão apagados.`)) return;
                    const r = await apagarContaFixa(f.id);
                    if (r.ok) onMudou();
                  }}
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
          <p className="font-semibold">Adicionar conta fixa</p>
          <div className="flex flex-wrap gap-2">
            {ATALHOS_FIXAS.map((a) => (
              <button
                key={a.nome}
                type="button"
                onClick={() => {
                  setNome(a.nome);
                  setCategoria(a.categoria);
                }}
                className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted cursor-pointer"
              >
                {emojiDe(a.categoria)} {a.nome}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Energia 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Vence todo dia</Label>
              <Input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Valor (se for sempre igual)</Label>
              <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="deixe vazio se muda" />
            </div>
          </div>
          {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
          <Button size="lg" onClick={adicionar} disabled={salvando} className="w-full cursor-pointer">
            {salvando ? <Loader2 className="animate-spin" /> : <Plus />} Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
