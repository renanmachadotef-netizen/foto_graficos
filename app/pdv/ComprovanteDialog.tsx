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
}: {
  c: ComprovanteVenda;
  empresa: string;
  onNova: () => void;
}) {
  const zap = whatsLink(c);

  return (
    <Dialog open onOpenChange={(a) => !a && onNova()}>
      <DialogContent className="sm:max-w-md max-h-[94vh] overflow-y-auto">
        <DialogTitle className="sr-only">Comprovante</DialogTitle>
        <DialogDescription className="sr-only">Resumo da venda registrada</DialogDescription>

        <div className="text-center space-y-1">
          <CheckCircle2 className="size-14 mx-auto text-emerald-600" />
          <p className="text-2xl font-semibold">{c.aberto ? "Pedido salvo!" : "Venda registrada!"}</p>
          <p className="text-muted-foreground">
            {c.aberto ? "Pedido" : "Venda"} #{c.numero} • {brl(c.total)}
          </p>
          {c.troco > 0 && <p className="text-xl font-bold text-green-700">Troco: {brl(c.troco)}</p>}
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
            <MessageCircle /> {zap ? "WhatsApp" : "Sem fone"}
          </Button>
        </div>
        <Button size="lg" onClick={onNova} className="w-full cursor-pointer">
          <Plus /> Nova venda
        </Button>

        <Recibo c={c} empresa={empresa} />
      </DialogContent>
    </Dialog>
  );
}
