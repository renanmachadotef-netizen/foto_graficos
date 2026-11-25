"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Janela de confirmação do sistema (no lugar do window.confirm do navegador).
 * "Cancelar" já vem selecionado, para um Enter sem querer não confirmar.
 */
export function ConfirmarDialog({
  aberto,
  aoFechar,
  titulo,
  descricao,
  rotuloConfirmar,
  perigo = false,
  pendente = false,
  erro,
  aoConfirmar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  perigo?: boolean;
  pendente?: boolean;
  erro?: string | null;
  aoConfirmar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !pendente) aoFechar(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        {erro && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {erro}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" autoFocus disabled={pendente} onClick={aoFechar} className="h-11 cursor-pointer">
            Cancelar
          </Button>
          <Button
            type="button"
            variant={perigo ? "destructive" : "default"}
            disabled={pendente}
            onClick={aoConfirmar}
            className="h-11 cursor-pointer"
          >
            {pendente ? "Aguarde…" : rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
