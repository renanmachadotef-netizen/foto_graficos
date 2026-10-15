"use client";

import type { ComprovanteVenda } from "./actions";
import { brl, qtdTexto } from "./venda-tipos";

export function whatsLink(c: ComprovanteVenda): string | null {
  if (!c.cliente.telefone) return null;
  let d = c.cliente.telefone.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12 || d.length > 13) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(c.whatsappTexto)}`;
}

/** O que sai na impressora termica (80 mm). So aparece no papel: na tela fica escondido. */
export function Recibo({ c, empresa }: { c: ComprovanteVenda; empresa: string }) {
  const dataTxt = new Date(c.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return (
    <>
      <div id="recibo-impressao" className="hidden print:block text-black text-[12px] leading-snug font-mono">
        <p className="text-center font-bold text-sm">{empresa}</p>
        <p className="text-center">
          {c.aberto ? "PEDIDO" : "VENDA"} #{c.numero} • {dataTxt}
        </p>
        <p>Cliente: {c.cliente.nome}</p>
        {c.vendedor && <p>Vendedor: {c.vendedor}</p>}
        <hr className="my-1 border-dashed border-black" />
        {c.itens.map((i, k) => (
          <div key={k} className="mb-0.5">
            <div className="flex justify-between gap-2">
              <span>
                {qtdTexto(i.quantidade)}x {i.nome}
              </span>
              <span>{brl(i.total)}</span>
            </div>
            {i.obs && <div className="pl-3">{i.obs}</div>}
          </div>
        ))}
        <hr className="my-1 border-dashed border-black" />
        {c.desconto > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>-{brl(c.desconto)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{brl(c.total)}</span>
        </div>
        {c.pagamentos.map((p, k) => (
          <div key={k} className="flex justify-between">
            <span>{p.forma}</span>
            <span>{brl(p.valor)}</span>
          </div>
        ))}
        {c.troco > 0 && (
          <div className="flex justify-between">
            <span>Troco</span>
            <span>{brl(c.troco)}</span>
          </div>
        )}
        {c.aberto && c.falta > 0 && (
          <div className="flex justify-between font-bold">
            <span>FALTA PAGAR</span>
            <span>{brl(c.falta)}</span>
          </div>
        )}
        <p className="text-center mt-2">Obrigado pela preferência!</p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #recibo-impressao, #recibo-impressao * { visibility: visible !important; }
          #recibo-impressao { display: block !important; position: absolute; left: 0; top: 0; width: 72mm; padding: 2mm; }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
    </>
  );
}
