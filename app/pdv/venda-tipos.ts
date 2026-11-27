export interface ProdutoPdv {
  id: string;
  name: string;
  code: string | null;
  category: string;
  price: number;
  cost: number;
  unit: string;
  temFoto?: boolean;
}

export interface ItemCarrinho {
  chave: string;
  productId: string | null;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  notes: string;
  larg?: string;
  alt?: string;
  pecas?: string;
}

export interface ClienteEscolhido {
  id: string;
  name: string;
  phone: string | null;
  deve: number;
  credito: number;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function paraNumero(txt: string): number {
  const l = txt.replace(/[^\d,.-]/g, "");
  if (!l) return 0;
  // Sem vírgula, um ponto seguido de exatamente 3 dígitos é separador de milhar ("1.500" = 1500).
  const milhar = !l.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(l);
  const n = Number(l.includes(",") ? l.replace(/\./g, "").replace(",", ".") : milhar ? l.replace(/\./g, "") : l);
  return Number.isFinite(n) ? n : 0;
}

/** Para medidas e metros: o ponto é decimal ("1.250" = 1,25), nunca milhar. */
export function paraDecimal(txt: string): number {
  return paraNumero(txt.includes(",") ? txt : txt.replace(".", ","));
}

export const texto2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");

export function qtdTexto(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export const arred = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function emojiCategoria(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("revela")) return "📷";
  if (c.includes("impress")) return "🖨️";
  if (c.includes("laser")) return "✂️";
  if (c.includes("uv")) return "🌈";
  if (c.includes("encad")) return "📚";
  if (c.includes("recorte")) return "✂️";
  if (c.includes("produto")) return "🎁";
  if (c.includes("arte")) return "🎨";
  if (c.includes("lamin")) return "📄";
  return "🏷️";
}
