// Importacao dos "pedidos em aberto" do NEX (planilha orders.xls).
// Cada pedido entra na Venda Rapida como pedido em aberto, com o mesmo numero que tinha no NEX.
// O preco de cada item vem do valor REAL do pedido (preco combinado, desconto), nao da tabela de precos.
import * as XLSX from "xlsx";
import { prisma } from "./prisma";
import { normalizarBusca } from "./busca";
import { brlParaNumero } from "./nex-import";

export interface ItemPedidoNex {
  quantidade: number;
  nome: string;
}

export interface PedidoNex {
  codigo: number;
  cliente: string;
  vendedor: string;
  observacao: string | null;
  endereco: string | null;
  bruto: number;
  total: number;
  desconto: number;
  quando: string; // ISO com fuso de Brasilia
  itens: ItemPedidoNex[];
}

export interface ResumoPedidos {
  total: number;
  valorTotal: number;
  itens: number;
  vendedores: string[];
}

const txt = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

function quando(data: unknown, hora: unknown): string {
  const m = String(data ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const h = String(hora ?? "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date().toISOString();
  const hh = String(h ? Number(h[1]) : 12).padStart(2, "0");
  const mm = h ? h[2] : "00";
  const ss = h && h[3] ? h[3] : "00";
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${hh}:${mm}:${ss}-03:00`).toISOString();
}

export function lerPedidos(buffer: Buffer): { pedidos: PedidoNex[]; resumo: ResumoPedidos } {
  const binario =
    (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) ||
    (buffer[0] === 0x50 && buffer[1] === 0x4b);
  const wb = binario
    ? XLSX.read(buffer, { type: "buffer" })
    : XLSX.read(buffer.toString("utf8").replace(/^﻿/, ""), { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = ws ? XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: "" }) : [];

  const pedidos: PedidoNex[] = [];
  for (const r of linhas) {
    const codigo = Number(String(r["Código"]).replace(/\D/g, ""));
    if (!codigo) continue;
    const itens: ItemPedidoNex[] = [];
    for (const l of String(r["Produtos"] ?? "").split("\n")) {
      const m = l.trim().match(/^(\d+(?:[.,]\d+)?)x\s+(.+)$/);
      if (!m) continue;
      const q = Number(m[1].replace(",", "."));
      if (q > 0) itens.push({ quantidade: q, nome: txt(m[2]) });
    }
    if (itens.length === 0) continue;
    const total = brlParaNumero(r["Total"]);
    const desconto = brlParaNumero(r["Desconto"]);
    const bruto = brlParaNumero(r["Valor bruto"]) || total + desconto;
    pedidos.push({
      codigo,
      cliente: txt(r["Cliente"]),
      vendedor: txt(r["Vendedor"]),
      observacao: txt(r["Observação"]) || null,
      endereco: txt(r["Endereço"]) || null,
      bruto,
      total,
      desconto,
      quando: quando(r["Data"], r["Hora"]),
      itens,
    });
  }
  return {
    pedidos,
    resumo: {
      total: pedidos.length,
      valorTotal: Math.round(pedidos.reduce((s, p) => s + p.total, 0) * 100) / 100,
      itens: pedidos.reduce((s, p) => s + p.itens.length, 0),
      vendedores: [...new Set(pedidos.map((p) => p.vendedor).filter(Boolean))],
    },
  };
}

export interface PreviaPedidos {
  jaImportados: number;
  novos: number;
  clientesEncontrados: number;
  clientesNovos: number;
  itensSemProduto: string[];
}

async function mapas() {
  const [produtos, clientes] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, price: true, cost: true } }),
    prisma.client.findMany({ where: { name: { not: "Cliente Balcão" } }, select: { id: true, name: true } }),
  ]);
  const prod = new Map<string, { id: string; price: number; cost: number }>();
  for (const p of produtos) {
    const k = normalizarBusca(p.name);
    if (!prod.has(k)) prod.set(k, { id: p.id, price: p.price, cost: p.cost });
  }
  const cli = new Map<string, string>();
  for (const c of clientes) {
    const k = normalizarBusca(c.name);
    if (!cli.has(k)) cli.set(k, c.id);
  }
  return { prod, cli };
}

export async function previaPedidos(pedidos: PedidoNex[]): Promise<PreviaPedidos> {
  const [{ prod, cli }, existentes] = await Promise.all([
    mapas(),
    prisma.quote.findMany({ where: { number: { in: pedidos.map((p) => p.codigo) } }, select: { number: true } }),
  ]);
  const ja = new Set(existentes.map((e) => e.number));
  const novos = pedidos.filter((p) => !ja.has(p.codigo));
  const semProduto = new Set<string>();
  for (const p of novos) for (const i of p.itens) if (!prod.has(normalizarBusca(i.nome))) semProduto.add(i.nome);
  const clientesNomes = new Set(novos.map((p) => normalizarBusca(p.cliente)));
  return {
    jaImportados: pedidos.length - novos.length,
    novos: novos.length,
    clientesEncontrados: [...clientesNomes].filter((n) => cli.has(n)).length,
    clientesNovos: [...clientesNomes].filter((n) => !cli.has(n)).length,
    itensSemProduto: [...semProduto],
  };
}

export interface RelatorioPedidos {
  criados: number;
  jaExistiam: number;
  clientesCriados: number;
  valorTotal: number;
  itensSemProduto: string[];
  naFilaDeProducao: number;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Divide o valor real do pedido entre os itens (itens do catalogo ficam proporcionais ao preco da tabela). */
function precificar(p: PedidoNex, prod: Map<string, { id: string; price: number; cost: number }>) {
  const achados = p.itens.map((i) => ({ ...i, produto: prod.get(normalizarBusca(i.nome)) ?? null }));
  const dosCatalogo = achados.filter((i) => i.produto);
  const avulsos = achados.filter((i) => !i.produto);
  const somaTabela = dosCatalogo.reduce((s, i) => s + i.quantidade * (i.produto!.price || 0), 0);
  const bruto = p.bruto > 0 ? p.bruto : p.total;
  const unit = new Map<(typeof achados)[number], number>();

  if (avulsos.length === 0) {
    const fator = somaTabela > 0 ? bruto / somaTabela : 0;
    const qtdTotal = dosCatalogo.reduce((s, i) => s + i.quantidade, 0);
    for (const i of dosCatalogo) {
      unit.set(i, somaTabela > 0 ? r2(i.produto!.price * fator) : r2(bruto / (qtdTotal || 1)));
    }
  } else {
    const sobra = Math.max(0, bruto - somaTabela);
    const qtdAvulsa = avulsos.reduce((s, i) => s + i.quantidade, 0);
    const fator = sobra === 0 && somaTabela > bruto ? bruto / somaTabela : 1;
    for (const i of dosCatalogo) unit.set(i, r2(i.produto!.price * fator));
    for (const i of avulsos) unit.set(i, r2(sobra / (qtdAvulsa || 1)));
  }
  return achados.map((i) => ({
    productId: i.produto?.id ?? null,
    description: i.nome,
    quantity: i.quantidade,
    unitPrice: unit.get(i) ?? 0,
    unitCost: i.produto?.cost ?? 0,
  }));
}

export async function aplicarPedidos(opcoes: { pedidos: PedidoNex[]; filaProducao: boolean }): Promise<RelatorioPedidos> {
  const { prod, cli } = await mapas();
  const usuarios = await prisma.user.findMany({ select: { id: true, name: true } });
  const idDoVendedor = (nome: string) => {
    const k = normalizarBusca(nome).split(" ")[0];
    if (!k) return null;
    return usuarios.find((u) => normalizarBusca(u.name).split(" ")[0] === k)?.id ?? null;
  };

  const existentes = await prisma.quote.findMany({
    where: { number: { in: opcoes.pedidos.map((p) => p.codigo) } },
    select: { number: true },
  });
  const ja = new Set(existentes.map((e) => e.number));

  const rel: RelatorioPedidos = { criados: 0, jaExistiam: ja.size, clientesCriados: 0, valorTotal: 0, itensSemProduto: [], naFilaDeProducao: 0 };
  const semProduto = new Set<string>();

  // do mais antigo para o mais novo, para a ordem de criacao ficar certa
  const novos = opcoes.pedidos.filter((p) => !ja.has(p.codigo)).sort((a, b) => a.quando.localeCompare(b.quando));
  for (const p of novos) {
    let clientId = cli.get(normalizarBusca(p.cliente)) ?? null;
    if (!clientId) {
      const nome = p.cliente || "Cliente sem nome";
      const c = await prisma.client.create({ data: { name: nome, searchKey: normalizarBusca(nome) }, select: { id: true } });
      clientId = c.id;
      cli.set(normalizarBusca(p.cliente), c.id);
      rel.clientesCriados++;
    }

    const itens = precificar(p, prod);
    for (const i of itens) if (!i.productId) semProduto.add(i.description);
    const vendedorId = idDoVendedor(p.vendedor);
    const custo = r2(itens.reduce((s, i) => s + i.unitCost * i.quantity, 0));
    const notas = [
      p.observacao,
      p.endereco ? `Entrega: ${p.endereco}` : null,
      !vendedorId && p.vendedor ? `Vendedor(a) no NEX: ${p.vendedor}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    await prisma.quote.create({
      data: {
        number: p.codigo,
        title: `Pedido #${p.codigo}`,
        clientId,
        sellerId: vendedorId,
        status: "OPEN",
        isPosSale: true,
        totalCost: custo,
        markup: custo > 0 ? p.total / custo : 1,
        finalPrice: p.total,
        netProfit: r2(p.total - custo),
        notes: notas || null,
        createdAt: new Date(p.quando),
        items: { create: itens },
        ...(opcoes.filaProducao ? { serviceOrder: { create: { status: "WAITING", priority: "NORMAL" } } } : {}),
      },
    });
    rel.criados++;
    rel.valorTotal = r2(rel.valorTotal + p.total);
    if (opcoes.filaProducao) rel.naFilaDeProducao++;
  }
  rel.itensSemProduto = [...semProduto];
  return rel;
}
