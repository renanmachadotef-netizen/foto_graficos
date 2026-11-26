"use client";

import { CheckCircle2, MessageCircle, Plus, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ComprovanteVenda } from "./actions";
import { Recibo, whatsLink } from "./Recibo";
import { brl } from "./venda-tipos";

export function ComprovanteDialog({
  c,
  empresa,
  onNova,
  onFechar,
  somenteVer = false,
}: {
  c: ComprovanteVenda;
  empresa: string;
  onNova: () => void;
  onFechar: () => void;
  somenteVer?: boolean;
}) {
  const zap = whatsLink(c);

  return (
    // Só fecha pelos botões: um clique fora não pode apagar a venda antes de imprimir o comprovante.
    <Dialog open disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-h-[94vh] overflow-y-auto">
        <DialogTitle className="sr-only">Comprovante</DialogTitle>
        <DialogDescription className="sr-only">Resumo da venda registrada</DialogDescription>

        <div className="text-center space-y-1">
          {c.troco > 0 && (
            <div className="mb-2 rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">Devolver ao cliente</p>
              <p className="text-5xl font-bold tabular-nums text-green-700">{brl(c.troco)}</p>
            </div>
          )}
          <CheckCircle2 className="size-10 mx-auto text-emerald-700" />
          <p className="text-lg font-semibold">{c.aberto ? "Pedido salvo" : "Venda registrada"}</p>
          <p className="text-muted-foreground">
            {c.aberto ? "Pedido" : "Venda"} #{c.numero} • {brl(c.total)}
          </p>
          {c.aberto && c.falta > 0 && <p className="font-semibold text-amber-700">Falta receber {brl(c.falta)}</p>}
          {c.fiado > 0 && <p className="font-semibold text-amber-700">{brl(c.fiado)} ficaram como fiado de {c.cliente.nome}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => window.print()} className="cursor-pointer">
            <Printer /> Imprimir
          </Button>
          <Button
            variant="outline"
            disabled={!zap}
            onClick={() => zap && window.open(zap, "_blank", "noopener")}
            title={zap ? "Enviar pelo WhatsApp" : "Cliente sem telefone"}
            className="cursor-pointer"
          >
            <MessageCircle /> {zap ? "WhatsApp" : "Sem telefone"}
          </Button>
        </div>
        {somenteVer ? (
          <Button size="lg" onClick={onFechar} className="w-full cursor-pointer">
            Fechar
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={onNova} className="w-full cursor-pointer">
              <Plus /> Nova venda
            </Button>
            <Button variant="ghost" onClick={onFechar} className="w-full cursor-pointer text-muted-foreground">
              Fechar (a venda já está registrada)
            </Button>
          </>
        )}

        <Recibo c={c} empresa={empresa} />
      </DialogContent>
    </Dialog>
  );
}
