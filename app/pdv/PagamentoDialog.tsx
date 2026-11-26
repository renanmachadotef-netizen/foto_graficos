"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Banknote, Check, Copy, CreditCard, Loader2, QrCode, Trash2, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gerarPix } from "@/lib/pix";
import { arred, brl, paraNumero, texto2 } from "./venda-tipos";

export interface LinhaPagamento {
  id: number;
  method: string;
  valor: string;
}

// Botões neutros: a cor fica reservada para estado (falta, troco, erro). O que muda é o ícone e o grupo.
const GRUPOS: { titulo: string; metodos: { v: string; l: string; icone: React.ReactNode }[] }[] = [
  {
    titulo: "PIX",
    metodos: [
      { v: "PIX_SICOOB", l: "Sicoob", icone: <QrCode className="size-5" /> },
      { v: "PIX_BRADESCO", l: "Bradesco", icone: <QrCode className="size-5" /> },
    ],
  },
  {
    titulo: "Cartão",
    metodos: [
      { v: "CARD_DEBIT", l: "Débito", icone: <CreditCard className="size-5" /> },
      { v: "CARD_CREDIT", l: "Crédito", icone: <CreditCard className="size-5" /> },
    ],
  },
  {
    titulo: "Outros",
    metodos: [
      { v: "CASH", l: "Dinheiro", icone: <Banknote className="size-5" /> },
      { v: "FIADO", l: "Fiado", icone: <UserRound className="size-5" /> },
    ],
  },
];
const METODOS = GRUPOS.flatMap((g) => g.metodos.map((m) => ({ ...m, l: g.titulo === "PIX" ? `PIX ${m.l}` : m.l })));
const NOTAS = [20, 50, 100, 200];

const rotulo = (v: string) => METODOS.find((m) => m.v === v)?.l ?? v;

function daquiADias(n: number) {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PagamentoDialog({
  total,
  jaPago,
  numeroVenda,
  clienteBalcao,
  empresa,
  cidade,
  pixSicoob,
  pixBradesco,
  salvando,
  erro,
  onFechar,
  onConfirmar,
}: {
  total: number;
  jaPago: number;
  numeroVenda: number | null;
  clienteBalcao: boolean;
  empresa: string;
  cidade: string;
  pixSicoob: string | null;
  pixBradesco: string | null;
  salvando: boolean;
  erro: string | null;
  onFechar: () => void;
  onConfirmar: (pagamentos: { method: string; amount: number }[], vencimentoFiado: string) => void;
}) {
  const [linhas, setLinhas] = useState<LinhaPagamento[]>([]);
  const [seq, setSeq] = useState(1);
  const [qrAberto, setQrAberto] = useState<number | null>(null);
  const [venc, setVenc] = useState(daquiADias(30));

  const soma = arred(linhas.reduce((s, l) => s + paraNumero(l.valor), 0));
  const pagoTotal = arred(jaPago + soma);
  const falta = arred(Math.max(0, total - pagoTotal));
  const excesso = arred(Math.max(0, pagoTotal - total));
  const dinheiroVivo = arred(linhas.filter((l) => l.method === "CASH").reduce((s, l) => s + paraNumero(l.valor), 0));
  const trocoOk = excesso <= dinheiroVivo + 0.005;
  const temFiado = linhas.some((l) => l.method === "FIADO" && paraNumero(l.valor) > 0);
  const podeFechar = falta <= 0.005 && trocoOk && linhas.length > 0 && !(temFiado && clienteBalcao);

  function adicionar(method: string) {
    const restante = arred(Math.max(0, total - pagoTotal));
    setLinhas((l) => [...l, { id: seq, method, valor: restante > 0 ? texto2(restante) : "" }]);
    setSeq((s) => s + 1);
    if (method.startsWith("PIX")) setQrAberto(seq);
  }

  function chavePix(method: string) {
    return method === "PIX_SICOOB" ? pixSicoob : method === "PIX_BRADESCO" ? pixBradesco : null;
  }

  return (
    <Dialog open disablePointerDismissal onOpenChange={(a) => !a && !salvando && onFechar()}>
      <DialogContent className="sm:max-w-lg max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Receber pagamento</DialogTitle>
        <DialogDescription>Toque na forma de pagamento. Pode misturar (ex.: parte no PIX, parte no dinheiro).</DialogDescription>

        <div className="rounded-2xl bg-muted/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">Total da venda{numeroVenda ? ` #${numeroVenda}` : ""}</p>
          <p className="text-4xl font-bold tabular-nums">{brl(total)}</p>
          {jaPago > 0 && <p className="text-sm text-emerald-700 font-medium mt-1">Já pago antes: {brl(jaPago)}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="space-y-1.5">
              <p className="text-sm font-semibold text-muted-foreground">{g.titulo}</p>
              {g.metodos.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => adicionar(m.v)}
                  className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-sm font-semibold hover:border-primary hover:bg-muted active:scale-95 transition-transform cursor-pointer"
                >
                  {m.icone}
                  {m.l}
                </button>
              ))}
            </div>
          ))}
        </div>

        {linhas.length > 0 && (
          <ul className="space-y-3">
            {linhas.map((l) => {
              const valor = paraNumero(l.valor);
              const chave = chavePix(l.method);
              return (
                <li key={l.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold flex-1">{rotulo(l.method)}</span>
                    <Input
                      inputMode="decimal"
                      value={l.valor}
                      onChange={(e) => setLinhas((x) => x.map((y) => (y.id === l.id ? { ...y, valor: e.target.value } : y)))}
                      className="w-32 text-right font-semibold"
                      aria-label={`Valor em ${rotulo(l.method)}`}
                    />
                    <button
                      type="button"
                      aria-label="Remover"
                      onClick={() => setLinhas((x) => x.filter((y) => y.id !== l.id))}
                      className="text-rose-600 size-11 flex items-center justify-center rounded-xl hover:bg-muted cursor-pointer"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>

                  {l.method.startsWith("PIX") &&
                    (chave ? (
                      qrAberto === l.id ? (
                        <QrPix
                          chave={chave}
                          valor={valor}
                          empresa={empresa}
                          cidade={cidade}
                          txid={numeroVenda ? `V${numeroVenda}` : "VENDA"}
                          onFechar={() => setQrAberto(null)}
                        />
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => setQrAberto(l.id)} className="cursor-pointer">
                          <QrCode /> Mostrar QR Code com o valor
                        </Button>
                      )
                    ) : (
                      <p className="text-sm text-amber-700">
                        Falta cadastrar a chave PIX desta conta.{" "}
                        <Link href="/settings" className="underline font-medium">
                          Configurar agora
                        </Link>
                      </p>
                    ))}

                  {l.method === "CASH" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Digite quanto o cliente deu, ou toque na nota.</p>
                      <div className="flex flex-wrap gap-2">
                        {NOTAS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setLinhas((x) => x.map((y) => (y.id === l.id ? { ...y, valor: texto2(n) } : y)))}
                            className="h-11 min-w-16 rounded-xl border border-border bg-card px-3 font-semibold tabular-nums hover:border-primary cursor-pointer"
                          >
                            R$ {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setLinhas((x) =>
                              x.map((y) => (y.id === l.id ? { ...y, valor: texto2(arred(Math.max(0, total - jaPago - (soma - paraNumero(l.valor))))) } : y)),
                            )
                          }
                          className="h-11 rounded-xl border border-border bg-card px-3 font-semibold hover:border-primary cursor-pointer"
                        >
                          Valor exato
                        </button>
                      </div>
                      {valor > 0 && arred(Math.max(0, pagoTotal - total)) > 0 && trocoOk && (
                        <p className="rounded-xl bg-muted px-3 py-2 text-center">
                          <span className="block text-sm text-muted-foreground">Devolver ao cliente</span>
                          <span className="block text-4xl font-bold tabular-nums text-green-700">{brl(arred(pagoTotal - total))}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {l.method === "FIADO" && (
                    <div className="space-y-1">
                      {clienteBalcao ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-rose-600 font-medium">Fiado precisa de cliente cadastrado.</p>
                          <Button type="button" variant="outline" size="sm" onClick={onFechar} className="cursor-pointer">
                            Voltar e escolher o cliente
                          </Button>
                        </div>
                      ) : (
                        <label className="text-sm flex items-center gap-2">
                          <span className="font-medium">Vai pagar até</span>
                          <input
                            type="date"
                            value={venc}
                            onChange={(e) => setVenc(e.target.value)}
                            className="h-10 rounded-lg border border-input bg-card px-2"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-xl border border-border p-3 space-y-1 text-base">
          {jaPago > 0 && <Linha rotulo="Já pago" valor={brl(jaPago)} />}
          <Linha rotulo="Recebendo agora" valor={brl(soma)} />
          {falta > 0.005 ? (
            <Linha rotulo="Falta" valor={brl(falta)} forte cor="text-rose-600" />
          ) : excesso > 0.005 ? (
            <Linha rotulo={trocoOk ? "Troco" : "Passou do total"} valor={brl(excesso)} forte cor={trocoOk ? "text-green-700" : "text-rose-600"} />
          ) : (
            <Linha rotulo="Tudo certo" valor="✓" forte cor="text-green-700" />
          )}
        </div>

        {erro && <p className="rounded-xl bg-rose-100 text-rose-800 px-3 py-2 font-semibold">{erro}</p>}

        <Button
          size="lg"
          disabled={!podeFechar || salvando}
          onClick={() =>
            onConfirmar(
              linhas.map((l) => ({ method: l.method, amount: paraNumero(l.valor) })).filter((p) => p.amount > 0),
              venc,
            )
          }
          className="w-full h-12 cursor-pointer bg-success text-success-foreground hover:bg-success hover:brightness-110"
        >
          {salvando ? <Loader2 className="animate-spin" /> : <Check />} Finalizar venda
        </Button>
        {!podeFechar && !salvando && (
          <p className="text-center text-sm text-muted-foreground">
            {linhas.length === 0
              ? "Escolha como o cliente vai pagar."
              : temFiado && clienteBalcao
                ? "Fiado precisa de cliente. Volte e escolha o cliente."
                : falta > 0.005
                  ? `Ainda falta ${brl(falta)}.`
                  : "O valor passou do total e não há dinheiro para dar troco."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Linha({ rotulo, valor, forte, cor = "" }: { rotulo: string; valor: string; forte?: boolean; cor?: string }) {
  return (
    <div className={`flex justify-between ${forte ? "font-bold text-lg" : "text-muted-foreground"} ${cor}`}>
      <span>{rotulo}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

function QrPix({
  chave,
  valor,
  empresa,
  cidade,
  txid,
  onFechar,
}: {
  chave: string;
  valor: number;
  empresa: string;
  cidade: string;
  txid: string;
  onFechar: () => void;
}) {
  const codigo = useMemo(
    () => gerarPix({ chave, valor: valor > 0 ? valor : undefined, nome: empresa, cidade, identificador: txid }),
    [chave, valor, empresa, cidade, txid],
  );
  const [img, setImg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarCodigo, setMostrarCodigo] = useState(false);

  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(codigo, { width: 280, margin: 1 }).then((url) => vivo && setImg(url));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setMostrarCodigo(true);
    }
  }

  return (
    <div className="rounded-xl bg-white p-3 text-center space-y-2 border border-border">
      {img ? <img src={img} alt="QR Code PIX" className="mx-auto size-56" /> : <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />}
      <p className="text-xs text-neutral-600">O valor {valor > 0 ? `de ${brl(valor)} ` : ""}já vai preenchido. Confirme no app do banco quando cair.</p>
      {mostrarCodigo && (
        <textarea
          readOnly
          value={codigo}
          rows={3}
          aria-label="Código PIX para copiar"
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-border bg-white p-2 text-xs text-neutral-800 break-all"
        />
      )}
      <div className="flex gap-2 justify-center">
        <Button type="button" variant="outline" size="sm" onClick={copiar} className="cursor-pointer">
          <Copy /> {copiado ? "Copiado!" : "Copiar código"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onFechar} className="cursor-pointer">
          <X /> Esconder
        </Button>
      </div>
    </div>
  );
}
