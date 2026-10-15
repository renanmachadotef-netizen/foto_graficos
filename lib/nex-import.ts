// Importacao das planilhas exportadas do NEX (Nextar): clientes e produtos.
// Regras importantes:
//  - o NEX repete o mesmo cliente em varias linhas (mesmo codigo, mesmo saldo): junta por codigo;
//  - o saldo "Debito/Credito" negativo = cliente deve (fiado); positivo = credito do cliente;
//  - reimportar e seguro: clientes e produtos sao atualizados pelo codigo, e o fiado antigo
//    de cada cliente so e criado uma vez.
import * as XLSX from "xlsx";

export interface ClienteNex {
  codigo: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  endereco: string | null;
  genero: string | null;
  nascimento: string | null; // YYYY-MM-DD
  observacao: string | null;
  saldo: number; // negativo = deve
  linhasJuntadas: number;
}

export interface ProdutoNex {
  codigo: string;
  nome: string;
  preco: number;
  custo: number;
  categoria: string;
  unidade: string;
  marca: string | null;
  observacao: string | null;
  ativo: boolean;
}

export interface ResumoClientes {
  linhas: number;
  unicos: number;
  duplicatasJuntadas: number;
  devedores: number;
  totalFiado: number; // positivo, quanto os clientes devem
  comCredito: number;
  totalCredito: number;
  comTelefone: number;
  conflitosDeSaldo: number;
}

export interface ResumoProdutos {
  total: number;
  semCusto: number;
  precoZero: number;
  categorias: Record<string, number>;
}

function lerLinhas(buffer: Buffer): Record<string, string>[] {
  // .xls (OLE2: D0 CF 11 E0) e .xlsx (zip: "PK") sao binarios; o resto e texto (CSV) e deve ser lido como UTF-8
  const binario =
    (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) ||
    (buffer[0] === 0x50 && buffer[1] === 0x4b);
  const wb = binario
    ? XLSX.read(buffer, { type: "buffer", cellDates: false })
    : XLSX.read(buffer.toString("utf8").replace(/^﻿/, ""), { type: "string", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: "" });
}

const txt = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function brlParaNumero(v: unknown): number {
  const t = String(v ?? "").replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : 0;
}

function dataBR(v: unknown): string | null {
  const m = String(v ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mes, a] = m;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${a}-${mes}-${d}`;
}

export function lerClientes(buffer: Buffer): { clientes: ClienteNex[]; resumo: ResumoClientes } {
  const linhas = lerLinhas(buffer);
  const porCodigo = new Map<string, ClienteNex>();
  const saldosPorCodigo = new Map<string, Set<number>>();
  let semCodigo = 0;

  for (const r of linhas) {
    const nome = txt(r["Nome"]);
    if (!nome) continue;
    // sem codigo: usa o nome como identidade (raro)
    const codigo = txt(r["Código"]) || `sem-codigo:${nome.toLowerCase()}`;
    if (!txt(r["Código"])) semCodigo++;
    const saldo = brlParaNumero(r["Débito/Crédito"]);
    const doc = txt(r["CPF/CNPJ"]).replace(/\D/g, "") || null;
    const tel = txt(r["Telefone"]) || null;
    const end = txt(r["Endereço"]) || null;
    const g = txt(r["Gênero"]).toUpperCase();
    const novo: ClienteNex = {
      codigo,
      nome,
      documento: doc,
      telefone: tel,
      endereco: end,
      genero: g === "M" || g === "F" ? g : null,
      nascimento: dataBR(r["Data de nascimento"]),
      observacao: txt(r["Observação"]) || null,
      saldo,
      linhasJuntadas: 1,
    };
    const atual = porCodigo.get(codigo);
    if (!atual) {
      porCodigo.set(codigo, novo);
      saldosPorCodigo.set(codigo, new Set([saldo]));
      continue;
    }
    atual.linhasJuntadas++;
    saldosPorCodigo.get(codigo)!.add(saldo);
    // completa o que faltava e prefere o nome mais completo
    if (!atual.documento && novo.documento) atual.documento = novo.documento;
    if (!atual.telefone && novo.telefone) atual.telefone = novo.telefone;
    if (!atual.endereco && novo.endereco) atual.endereco = novo.endereco;
    if (!atual.genero && novo.genero) atual.genero = novo.genero;
    if (!atual.nascimento && novo.nascimento) atual.nascimento = novo.nascimento;
    if (!atual.observacao && novo.observacao) atual.observacao = novo.observacao;
    if (novo.nome.length > atual.nome.length && novo.nome.toLowerCase().startsWith(atual.nome.toLowerCase())) {
      atual.nome = novo.nome;
    }
    if (atual.saldo === 0 && saldo !== 0) atual.saldo = saldo;
  }

  const clientes = [...porCodigo.values()];
  const devedores = clientes.filter((c) => c.saldo < 0);
  const credores = clientes.filter((c) => c.saldo > 0);
  const resumo: ResumoClientes = {
    linhas: linhas.length,
    unicos: clientes.length,
    duplicatasJuntadas: linhas.length - clientes.length,
    devedores: devedores.length,
    totalFiado: Math.round(-devedores.reduce((s, c) => s + c.saldo, 0) * 100) / 100,
    comCredito: credores.length,
    totalCredito: Math.round(credores.reduce((s, c) => s + c.saldo, 0) * 100) / 100,
    comTelefone: clientes.filter((c) => c.telefone).length,
    conflitosDeSaldo: [...saldosPorCodigo.values()].filter((s) => [...s].filter((x) => x !== 0).length > 1).length,
  };
  void semCodigo;
  return { clientes, resumo };
}

function unidadePadrao(u: string): string {
  const x = u.trim().toLowerCase();
  if (x === "metro" || x === "m") return "m";
  if (x === "peça" || x === "peca" || x === "") return "un";
  return u.trim();
}

export function lerProdutos(buffer: Buffer): { produtos: ProdutoNex[]; resumo: ResumoProdutos } {
  const linhas = lerLinhas(buffer);
  const porCodigo = new Map<string, ProdutoNex>();
  for (const r of linhas) {
    const nome = txt(r["Nome"]);
    const codigo = txt(r["Código"]);
    if (!nome || !codigo) continue;
    const status = txt(r["status"]).toLowerCase();
    porCodigo.set(codigo, {
      codigo,
      nome,
      preco: brlParaNumero(r["Preço"]),
      custo: brlParaNumero(r["Preço de custo"]),
      categoria: txt(r["Categoria"]) || "Sem categoria",
      unidade: unidadePadrao(txt(r["Unidade"])),
      marca: txt(r["Marca"]) || null,
      observacao: txt(r["Observação"]) || null,
      ativo: !(status.includes("inativ") || status.includes("desativ")),
    });
  }
  const produtos = [...porCodigo.values()];
  const categorias: Record<string, number> = {};
  for (const p of produtos) categorias[p.categoria] = (categorias[p.categoria] || 0) + 1;
  return {
    produtos,
    resumo: {
      total: produtos.length,
      semCusto: produtos.filter((p) => p.custo === 0 && p.preco > 0).length,
      precoZero: produtos.filter((p) => p.preco === 0).length,
      categorias,
    },
  };
}

/** Nomes dos exemplos que o sistema criava sozinho na primeira abertura. */
export const CLIENTES_DEMO = [
  "Studio Foto & Eventos Arte Digital",
  "Agência Criativa Marketing & Comunicação",
  "Restaurante Bella Italia (Cardápios & Banners)",
  "Imobiliária Sol Nascente (Placas & Fachadas)",
];

export const PRODUTOS_DEMO = [
  "Cartão de Visita 1000un (4x0)",
  "Banner Lona 440g c/ Bastão e Corda",
  "Adesivo Vinil Brilho Recortado",
  "Foto 3x4 (Cartela c/ 8 fotos)",
];

export function dataIso(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}
