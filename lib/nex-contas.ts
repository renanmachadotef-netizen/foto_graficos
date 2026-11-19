// Importacao da planilha "Contas a pagar" do NEX.
// Reimportar e seguro: cada conta recebe uma marca (hash dos dados) e so entra uma vez.
import * as XLSX from "xlsx";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { brlParaNumero, pegar, dataIso } from "./nex-import";

const MARCA = "nex-conta:";

export interface ContaNex {
  marca: string;
  descricao: string;
  fornecedor: string | null;
  vencimento: string; // YYYY-MM-DD
  valor: number; // valor da conta; se paga, o que foi pago
  paga: boolean;
  pagoEm: string | null;
  categoria: string | null;
  documento: string | null;
  obs: string | null;
}

export interface ResumoContas {
  linhas: number;
  pagas: number;
  abertas: number;
  totalPago: number;
  totalAberto: number;
  de: string | null;
  ate: string | null;
}

function ymd(v: unknown): string | null {
  if (typeof v === "number" && v > 20000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const m = String(v ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(v ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

/** Valor cru da coluna (numero de data do Excel continua numero). */
function cru(r: Record<string, unknown>, nome: string): unknown {
  const limpa = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const k = Object.keys(r).find((x) => limpa(x) === limpa(nome));
  return k ? r[k] : "";
}

export function lerContas(buffer: Buffer): { contas: ContaNex[]; resumo: ResumoContas } {
  // raw:true para as datas virem como numero (sem depender do formato da celula)
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = ws ? XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" }) : [];
  const contas: ContaNex[] = [];
  const vistas = new Map<string, number>();

  for (const r of linhas) {
    const status = pegar(r, "Status");
    const venc = ymd(cru(r, "Vencimento"));
    const valorConta = brlParaNumero(pegar(r, "Valor"));
    if (!venc || !(valorConta > 0)) continue;
    const descricao = pegar(r, "Referente a").replace(/\s+/g, " ").trim() || "Conta";
    const fornecedor = pegar(r, "Fornecedor").trim() || null;
    const paga = status.trim().toLowerCase() === "paga";
    const pagoEm = paga ? ymd(cru(r, "Pago em")) ?? venc : null;
    const valorPago = brlParaNumero(pegar(r, "Valor Pago"));
    const lancado = pegar(r, "Lançado em");
    // linhas identicas (mesma conta lancada duas vezes de proposito) ganham numero de ordem
    const base = [venc, valorConta, descricao.toLowerCase(), (fornecedor ?? "").toLowerCase(), lancado].join("|");
    const n = (vistas.get(base) ?? 0) + 1;
    vistas.set(base, n);
    const marca = MARCA + createHash("sha1").update(base + "|" + n).digest("hex").slice(0, 16);
    contas.push({
      marca,
      descricao: descricao.slice(0, 120),
      fornecedor,
      vencimento: venc,
      valor: paga && valorPago > 0 ? valorPago : valorConta,
      paga,
      pagoEm,
      categoria: pegar(r, "Categoria").trim() || null,
      documento: pegar(r, "Número do Documento").trim() || null,
      obs: pegar(r, "Observação").trim() || null,
    });
  }

  const pagas = contas.filter((c) => c.paga);
  const abertas = contas.filter((c) => !c.paga);
  const datas = contas.map((c) => c.vencimento).sort();
  const soma = (l: ContaNex[]) => Math.round(l.reduce((s, c) => s + c.valor, 0) * 100) / 100;
  return {
    contas,
    resumo: {
      linhas: linhas.length,
      pagas: pagas.length,
      abertas: abertas.length,
      totalPago: soma(pagas),
      totalAberto: soma(abertas),
      de: datas[0] ?? null,
      ate: datas[datas.length - 1] ?? null,
    },
  };
}

/** Contas que ja existem no banco: as importadas antes (pela marca) e as digitadas aqui (mesmo dia, valor e nome). */
async function jaExistentes() {
  const todas = await prisma.financialTransaction.findMany({
    where: { type: "EXPENSE" },
    select: { notes: true, dueDate: true, amount: true, description: true },
  });
  const marcas = new Set<string>();
  const manuais = new Set<string>();
  for (const t of todas) {
    if (t.notes?.startsWith(MARCA)) marcas.add(t.notes.split("\n")[0]);
    else manuais.add(`${t.dueDate.toISOString().slice(0, 10)}|${Math.round(t.amount * 100)}|${t.description.trim().toLowerCase()}`);
  }
  return { marcas, manuais };
}

const chaveManual = (c: ContaNex) => `${c.vencimento}|${Math.round(c.valor * 100)}|${c.descricao.trim().toLowerCase()}`;

export interface PreviaContas {
  novas: number;
  jaImportadas: number;
  jaDigitadas: number;
  novasAbertas: number;
}

export async function previaContas(contas: ContaNex[], incluirAbertas: boolean): Promise<PreviaContas> {
  const { marcas, manuais } = await jaExistentes();
  let novas = 0, jaImportadas = 0, jaDigitadas = 0, novasAbertas = 0;
  for (const c of contas) {
    if (!c.paga && !incluirAbertas) continue;
    if (marcas.has(c.marca)) jaImportadas++;
    else if (manuais.has(chaveManual(c))) jaDigitadas++;
    else {
      novas++;
      if (!c.paga) novasAbertas++;
    }
  }
  return { novas, jaImportadas, jaDigitadas, novasAbertas };
}

export interface RelatorioContas {
  criadas: number;
  jaExistiam: number;
  abertasCriadas: number;
}

export async function aplicarContas(contas: ContaNex[], incluirAbertas: boolean): Promise<RelatorioContas> {
  const { marcas, manuais } = await jaExistentes();
  const novas = contas.filter((c) => (c.paga || incluirAbertas) && !marcas.has(c.marca) && !manuais.has(chaveManual(c)));
  for (let i = 0; i < novas.length; i += 500) {
    await prisma.financialTransaction.createMany({
      data: novas.slice(i, i + 500).map((c) => ({
        description: c.descricao,
        supplier: c.fornecedor,
        amount: c.valor,
        type: "EXPENSE",
        status: c.paga ? "PAID" : "PENDING",
        category: c.categoria,
        dueDate: dataIso(c.vencimento),
        date: dataIso(c.vencimento),
        paymentDate: c.paga && c.pagoEm ? dataIso(c.pagoEm) : null,
        notes: c.marca + (c.documento ? `\nDoc: ${c.documento}` : "") + (c.obs ? `\n${c.obs}` : ""),
      })),
    });
  }
  const considerar = contas.filter((c) => c.paga || incluirAbertas).length;
  return { criadas: novas.length, jaExistiam: considerar - novas.length, abertasCriadas: novas.filter((c) => !c.paga).length };
}

/** Estoque do NEX: so preenche o custo dos produtos que ainda estao sem custo. */
export async function aplicarCustos(custos: { codigo: string; custo: number }[]): Promise<number> {
  let n = 0;
  for (const c of custos) {
    const r = await prisma.product.updateMany({ where: { code: c.codigo, cost: 0 }, data: { cost: c.custo } });
    n += r.count;
  }
  return n;
}

export async function previaCustos(custos: { codigo: string; custo: number }[]): Promise<number> {
  if (!custos.length) return 0;
  return prisma.product.count({ where: { code: { in: custos.map((c) => c.codigo) }, cost: 0 } });
}
