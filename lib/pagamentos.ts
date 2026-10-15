// Formas de pagamento usadas na loja (as mesmas do NEX, incluindo as duas contas PIX).
export const FORMAS_PAGAMENTO: { v: string; l: string }[] = [
  { v: "PIX_SICOOB", l: "PIX Sicoob" },
  { v: "PIX_BRADESCO", l: "PIX Bradesco" },
  { v: "CASH", l: "Dinheiro" },
  { v: "CARD_DEBIT", l: "Cartão de débito" },
  { v: "CARD_CREDIT", l: "Cartão de crédito" },
  { v: "TRANSFER", l: "Transferência" },
  { v: "BOLETO", l: "Boleto" },
  { v: "PIX", l: "PIX (outro)" },
  { v: "OTHER", l: "Outro" },
];

export function rotuloPagamento(v: string | null | undefined): string {
  if (!v) return "";
  if (v === "FIADO") return "Fiado";
  return FORMAS_PAGAMENTO.find((f) => f.v === v)?.l ?? v;
}

/** Categorias que representam fiado (dinheiro que o cliente ainda deve ou ja pagou depois). */
export const CATEGORIAS_FIADO = ["Fiado antigo", "Fiado"];
