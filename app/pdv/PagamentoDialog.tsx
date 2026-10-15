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

const METODOS: { v: string; l: string; icone: React.ReactNode; cor: string }[] = [
  { v: "PIX_SICOOB", l: "PIX Sicoob", icone: <QrCode className="size-5" />, cor: "bg-emerald-600" },
  { v: "PIX_BRADESCO", l: "PIX Bradesco", icone: <QrCode className="size-5" />, cor: "bg-rose-600" },
  { v: "CASH", l: "Dinheiro", icone: <Banknote className="size-5" />, cor: "bg-green-700" },
  { v: "CARD_DEBIT", l: "Débito", icone: <CreditCard className="size-5" />, cor: "bg-sky-600" },
  { v: "CARD_CREDIT", l: "Crédito", icone: <CreditCard className="size-5" />, cor: "bg-indigo-600" },
  { v: "FIADO", l: "Fiado", icone: <UserRound className="size-5" />, cor: "bg-amber-600" },
];

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
    <Dialog open onOpenChange={(a) => !a && !salvando && onFechar()}>
      <DialogContent className="sm:max-w-lg max-h-[94vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">Receber pagamento</DialogTitle>
        <DialogDescription>Toque na forma de pagamento. Pode misturar (ex.: parte no PIX, parte no dinheiro).</DialogDescription>

        <div className="rounded-2xl bg-muted/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">Total da venda{numeroVenda ? ` #${numeroVenda}` : ""}</p>
          <p className="text-4xl font-bold tabular-nums">{brl(total)}</p>
          {jaPago > 0 && <p className="text-sm text-emerald-700 font-medium mt-1">Já pago antes: {brl(jaPago)}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METODOS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => adicionar(m.v)}
              className={`${m.cor} text-white rounded-xl py-3 px-2 flex flex-col items-center gap-1 text-sm font-semibold cursor-pointer active:scale-95 transition-transform`}
            >
              {m.icone}
              {m.l}
            </button>
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
                      className="text-rose-600 p-1 cursor-pointer"
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

                  {l.method === "CASH" && valor > 0 && arred(Math.max(0, pagoTotal - total)) > 0 && trocoOk && (
                    <p className="text-sm font-semibold text-green-700">Troco: {brl(arred(pagoTotal - total))}</p>
                  )}

                  {l.method === "FIADO" && (
                    <div className="space-y-1">
                      {clienteBalcao ? (
                        <p className="text-sm text-rose-600 font-medium">Para vender fiado, volte e escolha o cliente.</p>
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
          <Linha rotulo="Total" valor={brl(total)} />
          {jaPago > 0 && <Linha rotulo="Já pago" valor={brl(jaPago)} />}
          <Linha rotulo="Agora" valor={brl(soma)} />
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
          className="w-full cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 hover:brightness-100"
        >
          {salvando ? <Loader2 className="animate-spin" /> : <Check />} Finalizar venda
        </Button>
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
      window.prompt("Copie o código PIX:", codigo);
    }
  }

  return (
    <div className="rounded-xl bg-white p-3 text-center space-y-2 border border-border">
      {img ? <img src={img} alt="QR Code PIX" className="mx-auto size-56" /> : <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />}
      <p className="text-xs text-neutral-600">O valor {valor > 0 ? `de ${brl(valor)} ` : ""}já vai preenchido. Confirme no app do banco quando cair.</p>
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
