"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Lock, LockOpen, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { abrirCaixa, estadoCaixa, fecharCaixa, movimentarCaixa, type EstadoCaixa } from "./actions";
import { brl } from "../pdv/venda-tipos";

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Aceita "12,50", "1.234,56" ou "12.5". Vazio vira NaN para o servidor recusar. */
function numero(t: string): number {
  const s = t.trim().replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(norm);
}

type Modal = null | "ABRIR" | "SANGRIA" | "SUPRIMENTO" | "FECHAR";

export function CaixaView() {
  const [estado, setEstado] = useState<EstadoCaixa | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [valor, setValor] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => setEstado(await estadoCaixa()), []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrir(m: Modal) {
    setModal(m);
    setValor("");
    setTexto("");
    setErro("");
  }

  async function confirmar() {
    if (!modal) return;
    setSalvando(true);
    const v = numero(valor);
    const r =
      modal === "ABRIR" ? await abrirCaixa(v) : modal === "FECHAR" ? await fecharCaixa(v, texto) : await movimentarCaixa(modal, v, texto);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setModal(null);
    carregar();
  }

  if (!estado) {
    return (
      <div className="p-10 flex justify-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const cx = estado.aberto;
  const contadoNum = numero(valor);
  const difPrevia = modal === "FECHAR" && cx && Number.isFinite(contadoNum) ? Math.round((contadoNum - cx.esperado) * 100) / 100 : null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Wallet className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Caixa</h1>
          <p className="text-muted-foreground">{cx ? `Aberto por ${cx.abertoPor} em ${dataHora(cx.abertoEm)}` : "O caixa está fechado."}</p>
        </div>
      </div>

      {!cx ? (
        <div className="rounded-xl border p-8 text-center space-y-4">
          <Lock className="size-12 mx-auto text-muted-foreground" />
          <p className="text-lg">Para começar o dia, abra o caixa informando o troco que está na gaveta.</p>
          <Button size="lg" onClick={() => abrir("ABRIR")} className="cursor-pointer">
            <LockOpen /> Abrir caixa
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border p-5 text-center">
            <p className="text-muted-foreground">Dinheiro que deve estar na gaveta agora</p>
            <p className="text-4xl font-bold">{brl(cx.esperado)}</p>
          </div>

          <div className="rounded-xl border divide-y">
            <Linha t="Troco inicial" v={cx.troco} />
            <Linha t="+ Vendas em dinheiro" v={cx.vendasDinheiro} />
            <Linha t="+ Suprimentos (dinheiro colocado)" v={cx.suprimentos} />
            <Linha t="− Sangrias (dinheiro retirado)" v={-cx.sangrias} />
            <Linha t="− Contas pagas em dinheiro" v={-cx.pagamentosDinheiro} />
          </div>

          {cx.outrasFormas.length > 0 && (
            <div className="rounded-xl border p-4">
              <p className="font-medium mb-2">Entrou fora da gaveta (só para conferir)</p>
              {cx.outrasFormas.map((f) => (
                <div key={f.forma} className="flex justify-between text-sm py-0.5">
                  <span>{f.forma}</span>
                  <span>{brl(f.valor)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" size="lg" onClick={() => abrir("SANGRIA")} className="cursor-pointer">
              <ArrowUpCircle /> Retirar dinheiro
            </Button>
            <Button variant="outline" size="lg" onClick={() => abrir("SUPRIMENTO")} className="cursor-pointer">
              <ArrowDownCircle /> Colocar dinheiro
            </Button>
            <Button size="lg" onClick={() => abrir("FECHAR")} className="cursor-pointer">
              <Lock /> Fechar caixa
            </Button>
          </div>

          {cx.movimentos.length > 0 && (
            <div className="rounded-xl border p-4 space-y-1">
              <p className="font-medium mb-1">Retiradas e entradas deste caixa</p>
              {cx.movimentos.map((m) => (
                <div key={m.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {dataHora(m.createdAt)} • {m.type === "SANGRIA" ? "Retirou" : "Colocou"} — {m.reason} ({m.createdBy})
                  </span>
                  <span className={m.type === "SANGRIA" ? "text-red-600" : "text-green-700"}>
                    {m.type === "SANGRIA" ? "−" : "+"}
                    {brl(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {estado.historico.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Caixas anteriores</h2>
          <div className="rounded-xl border divide-y">
            {estado.historico.map((h) => (
              <div key={h.id} className="p-3 text-sm flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {dataHora(h.abertoEm)} → {dataHora(h.fechadoEm)}
                  </p>
                  <p className="text-muted-foreground">
                    Aberto por {h.abertoPor} • fechado por {h.fechadoPor}
                    {h.notes ? ` • ${h.notes}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    Esperado {brl(h.esperado)} • Contado {brl(h.contado)}
                  </p>
                  <p className={h.diferenca === 0 ? "text-green-700" : h.diferenca < 0 ? "text-red-600 font-semibold" : "text-amber-700 font-semibold"}>
                    {h.diferenca === 0 ? "Fechou certinho" : h.diferenca < 0 ? `Faltou ${brl(-h.diferenca)}` : `Sobrou ${brl(h.diferenca)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={(a) => !a && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {modal === "ABRIR" ? "Abrir caixa" : modal === "FECHAR" ? "Fechar caixa" : modal === "SANGRIA" ? "Retirar dinheiro do caixa" : "Colocar dinheiro no caixa"}
          </DialogTitle>
          <DialogDescription>
            {modal === "ABRIR" && "Quanto de troco tem na gaveta agora?"}
            {modal === "FECHAR" && cx && `O sistema espera ${brl(cx.esperado)} em dinheiro. Conte a gaveta e digite o valor.`}
            {modal === "SANGRIA" && "Ex.: levou para o banco, pagou o motoboy, vale ao funcionário."}
            {modal === "SUPRIMENTO" && "Ex.: colocou troco extra na gaveta."}
          </DialogDescription>
          <Input
            autoFocus
            inputMode="decimal"
            placeholder={modal === "FECHAR" ? "Dinheiro contado (R$)" : "Valor (R$)"}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && modal === "ABRIR" && confirmar()}
          />
          {difPrevia !== null && (
            <p className={difPrevia === 0 ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
              {difPrevia === 0 ? "Está certinho!" : difPrevia < 0 ? `Faltam ${brl(-difPrevia)}` : `Sobram ${brl(difPrevia)}`}
            </p>
          )}
          {modal && modal !== "ABRIR" && (
            <Input
              placeholder={modal === "FECHAR" ? "Observação (obrigatória se tiver diferença)" : "Motivo"}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
            />
          )}
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <Button size="lg" disabled={salvando} onClick={confirmar} className="w-full cursor-pointer">
            {salvando && <Loader2 className="animate-spin" />} Confirmar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Linha({ t, v }: { t: string; v: number }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <span>{t}</span>
      <span className={v < 0 ? "text-red-600" : ""}>{brl(v === 0 ? 0 : v)}</span>
    </div>
  );
}
