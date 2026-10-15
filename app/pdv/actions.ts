"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizarBusca } from "@/lib/busca";
import { rotuloPagamento } from "@/lib/pagamentos";
import { revalidatePath } from "next/cache";

const dinheiro = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

async function sessaoVendedor() {
  const s = await getSession();
  return s && ["ADMIN", "MANAGER", "SELLER"].includes(s.role) ? s : null;
}

/* ---------- clientes ---------- */

export interface ClienteBusca {
  id: string;
  name: string;
  phone: string | null;
  document: string | null;
  deve: number; // fiado em aberto
  credito: number;
}

export async function buscarClientes(texto: string): Promise<ClienteBusca[]> {
  if (!(await sessaoVendedor())) return [];
  const palavras = normalizarBusca(texto).split(" ").filter(Boolean).slice(0, 5);
  if (palavras.length === 0) return [];
  const achados = await prisma.client.findMany({
    where: { name: { not: "Cliente Balcão" }, AND: palavras.map((p) => ({ searchKey: { contains: p } })) },
    orderBy: { name: "asc" },
    take: 15,
    select: { id: true, name: true, phone: true, document: true, credit: true },
  });
  if (achados.length === 0) return [];
  const deve = await prisma.financialTransaction.groupBy({
    by: ["clientId"],
    where: { clientId: { in: achados.map((c) => c.id) }, type: "INCOME", status: "PENDING" },
    _sum: { amount: true },
  });
  const mapa = new Map(deve.map((d) => [d.clientId, d._sum.amount ?? 0]));
  return achados.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    document: c.document,
    deve: dinheiro(mapa.get(c.id) ?? 0),
    credito: c.credit,
  }));
}

export async function criarClienteRapido(d: { nome: string; telefone?: string }) {
  if (!(await sessaoVendedor())) return { ok: false as const, erro: "Sem permissao." };
  const nome = d.nome.trim().replace(/\s+/g, " ");
  if (nome.length < 2) return { ok: false as const, erro: "Escreva o nome do cliente." };
  const c = await prisma.client.create({
    data: {
      name: nome,
      phone: d.telefone?.trim() || null,
      searchKey: normalizarBusca(nome, d.telefone),
    },
    select: { id: true, name: true, phone: true },
  });
  return { ok: true as const, cliente: { id: c.id, name: c.name, phone: c.phone, document: null, deve: 0, credito: 0 } };
}

/* ---------- vender ---------- */

export interface ItemVenda {
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  notes?: string;
}

export interface PagamentoVenda {
  method: string; // PIX_SICOOB, PIX_BRADESCO, CASH, CARD_DEBIT, CARD_CREDIT, FIADO...
  amount: number;
}

export interface DadosVenda {
  quoteId?: string | null; // continuando um pedido em aberto
  clientId?: string | null;
  sellerId?: string | null;
  items: ItemVenda[];
  discount: number;
  payments: PagamentoVenda[];
  fechar: boolean; // true = venda (tem que estar tudo pago ou fiado); false = deixar como pedido em aberto
  paraProducao: boolean;
  vencimentoFiado?: string; // YYYY-MM-DD
  notes?: string;
}

export interface ComprovanteVenda {
  quoteId: string;
  numero: number;
  aberto: boolean;
  total: number;
  desconto: number;
  jaPago: number;
  pago: number;
  fiado: number;
  troco: number;
  falta: number;
  cliente: { nome: string; telefone: string | null };
  vendedor: string | null;
  data: string;
  itens: { nome: string; quantidade: number; unitario: number; total: number; obs?: string }[];
  pagamentos: { forma: string; valor: number }[];
  whatsappTexto: string;
}

type Retorno = { ok: true; comprovante: ComprovanteVenda } | { ok: false; erro: string };

export async function salvarVenda(d: DadosVenda): Promise<Retorno> {
  const sessao = await sessaoVendedor();
  if (!sessao) return { ok: false, erro: "Voce nao tem permissao para vender." };

  // 1) itens e totais
  const itens = (d.items || []).filter((i) => i && i.name?.trim());
  if (itens.length === 0) return { ok: false, erro: "Coloque pelo menos um item na venda." };
  for (const i of itens) {
    if (!(i.quantity > 0)) return { ok: false, erro: `A quantidade de "${i.name}" precisa ser maior que zero.` };
    if (!(i.unitPrice >= 0)) return { ok: false, erro: `O preco de "${i.name}" esta errado.` };
  }
  const subtotal = dinheiro(itens.reduce((s, i) => s + dinheiro(i.quantity * i.unitPrice), 0));
  const desconto = Math.min(Math.max(dinheiro(d.discount), 0), subtotal);
  const total = dinheiro(subtotal - desconto);

  // 2) cliente (sem cliente = "Cliente Balcao")
  let clientId = d.clientId || null;
  let ehBalcao = false;
  if (clientId) {
    const existe = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!existe) clientId = null;
  }
  if (!clientId) {
    let b = await prisma.client.findFirst({ where: { name: "Cliente Balcão" }, select: { id: true } });
    if (!b) b = await prisma.client.create({ data: { name: "Cliente Balcão", searchKey: "cliente balcao" }, select: { id: true } });
    clientId = b.id;
    ehBalcao = true;
  }

  // 3) pedido em aberto que esta sendo continuado
  let existente: { id: string; number: number | null; status: string } | null = null;
  let jaPago = 0;
  if (d.quoteId) {
    existente = await prisma.quote.findUnique({ where: { id: d.quoteId }, select: { id: true, number: true, status: true } });
    if (!existente || existente.status !== "OPEN") return { ok: false, erro: "Esse pedido ja foi fechado ou nao existe mais." };
    const pagos = await prisma.financialTransaction.aggregate({
      where: { quoteId: existente.id, type: "INCOME", status: "PAID" },
      _sum: { amount: true },
    });
    jaPago = dinheiro(pagos._sum.amount ?? 0);
  }

  // 4) pagamentos
  const pagamentos = (d.payments || []).filter((p) => p && dinheiro(p.amount) > 0);
  const fiado = dinheiro(pagamentos.filter((p) => p.method === "FIADO").reduce((s, p) => s + p.amount, 0));
  const agora0 = dinheiro(pagamentos.filter((p) => p.method !== "FIADO").reduce((s, p) => s + p.amount, 0));
  if (fiado > 0 && ehBalcao) return { ok: false, erro: "Para vender fiado, escolha o cliente." };

  const recebido = dinheiro(jaPago + agora0 + fiado);
  let troco = 0;
  if (recebido > total + 0.005) {
    troco = dinheiro(recebido - total);
    const dinheiroVivo = dinheiro(pagamentos.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0));
    if (troco > dinheiroVivo + 0.005) return { ok: false, erro: "Os pagamentos passam do total da venda." };
  }
  const falta = dinheiro(Math.max(0, total - recebido));
  if (d.fechar && falta > 0.005) return { ok: false, erro: `Ainda faltam ${falta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para fechar a venda.` };

  // o troco sai do dinheiro: registra so o que ficou na loja
  let trocoRestante = troco;
  const registrar = pagamentos.map((p) => {
    let valor = dinheiro(p.amount);
    if (p.method === "CASH" && trocoRestante > 0) {
      const abate = Math.min(trocoRestante, valor);
      valor = dinheiro(valor - abate);
      trocoRestante = dinheiro(trocoRestante - abate);
    }
    return { method: p.method, amount: valor };
  }).filter((p) => p.amount > 0);

  // vendedor escolhido (ou quem esta logado); se o usuario nao existir mais, vende sem vendedor em vez de falhar
  const candidato = d.sellerId || sessao.id;
  const vendedorExiste = await prisma.user.findUnique({ where: { id: candidato }, select: { id: true } });
  const vendedorId = vendedorExiste ? candidato : null;
  const totalCusto = dinheiro(itens.reduce((s, i) => s + (i.unitCost || 0) * i.quantity, 0));
  const agora = new Date();

  // 5) grava tudo junto (numero da venda = maior + 1)
  const resultado = await prisma.$transaction(async (tx) => {
    let numero = existente?.number ?? null;
    if (numero == null) {
      const max = await tx.quote.aggregate({ _max: { number: true } });
      numero = (max._max.number ?? 0) + 1;
    }
    const dadosQuote = {
      clientId: clientId!,
      sellerId: vendedorId,
      number: numero,
      title: `Venda #${numero}`,
      status: d.fechar ? "APPROVED" : "OPEN",
      isPosSale: true,
      totalCost: totalCusto,
      markup: totalCusto > 0 ? total / totalCusto : 1,
      finalPrice: total,
      netProfit: dinheiro(total - totalCusto),
    };
    let quoteId: string;
    if (existente) {
      await tx.quoteItem.deleteMany({ where: { quoteId: existente.id } });
      await tx.quote.update({ where: { id: existente.id }, data: dadosQuote });
      quoteId = existente.id;
    } else {
      const q = await tx.quote.create({ data: dadosQuote, select: { id: true } });
      quoteId = q.id;
    }
    await tx.quoteItem.createMany({
      data: itens.map((i) => ({
        quoteId,
        productId: i.productId || null,
        description: i.name.trim() + (i.notes?.trim() ? ` (${i.notes.trim()})` : ""),
        quantity: i.quantity,
        unitCost: i.unitCost || 0,
        unitPrice: i.unitPrice,
      })),
    });

    // pagamentos novos
    const vence = d.vencimentoFiado && /^\d{4}-\d{2}-\d{2}$/.test(d.vencimentoFiado)
      ? new Date(`${d.vencimentoFiado}T12:00:00`)
      : new Date(agora.getTime() + 30 * 86400000);
    for (const p of registrar) {
      if (p.method === "FIADO") {
        await tx.financialTransaction.create({
          data: {
            quoteId,
            clientId: clientId!,
            description: `Fiado - Venda #${numero}`,
            amount: p.amount,
            type: "INCOME",
            status: "PENDING",
            category: "Fiado",
            dueDate: vence,
          },
        });
      } else {
        await tx.financialTransaction.create({
          data: {
            quoteId,
            clientId: clientId!,
            description: `Venda #${numero}`,
            amount: p.amount,
            type: "INCOME",
            status: "PAID",
            paymentMethod: p.method,
            paymentDate: agora,
            dueDate: agora,
            category: "Vendas Balcão",
          },
        });
      }
    }

    // fila de producao
    if (d.paraProducao) {
      const so = await tx.serviceOrder.findUnique({ where: { quoteId }, select: { id: true } });
      if (!so) {
        await tx.serviceOrder.create({
          data: { quoteId, status: "WAITING", priority: "NORMAL", deliveryDate: new Date(agora.getTime() + 86400000) },
        });
      }
    }
    return { quoteId, numero };
  });

  // 6) comprovante
  const [cliente, vendedor, empresa] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { name: true, phone: true } }),
    vendedorId ? prisma.user.findUnique({ where: { id: vendedorId }, select: { name: true } }) : Promise.resolve(null),
    prisma.companySettings.findFirst({ select: { companyName: true } }),
  ]);
  const nomeLoja = empresa?.companyName || "Foto & Gráficos";
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pagos = registrar.filter((p) => p.method !== "FIADO");
  let texto = `Olá, ${cliente?.name.split(" ")[0]}! Obrigado por comprar na *${nomeLoja}*.\n\n`;
  texto += `*${d.fechar ? "Venda" : "Pedido"} #${resultado.numero}*\n`;
  itens.forEach((i) => (texto += `• ${i.quantity}x ${i.name} — ${brl(dinheiro(i.quantity * i.unitPrice))}\n`));
  if (desconto > 0) texto += `Desconto: ${brl(desconto)}\n`;
  texto += `\n*Total: ${brl(total)}*\n`;
  if (!d.fechar) texto += `Já pago: ${brl(dinheiro(jaPago + agora0))} • Falta: ${brl(falta)}\n`;
  else if (fiado > 0) texto += `Fiado: ${brl(fiado)}\n`;
  else texto += `Pago ✅\n`;

  revalidatePath("/pdv");
  revalidatePath("/financial");
  revalidatePath("/receber");
  revalidatePath("/pcp");
  revalidatePath("/quotes");
  revalidatePath("/");

  return {
    ok: true,
    comprovante: {
      quoteId: resultado.quoteId,
      numero: resultado.numero,
      aberto: !d.fechar,
      total,
      desconto,
      jaPago,
      pago: dinheiro(pagos.reduce((s, p) => s + p.amount, 0)),
      fiado,
      troco,
      falta,
      cliente: { nome: cliente?.name ?? "Cliente Balcão", telefone: ehBalcao ? null : cliente?.phone ?? null },
      vendedor: vendedor?.name ?? null,
      data: agora.toISOString(),
      itens: itens.map((i) => ({
        nome: i.name,
        quantidade: i.quantity,
        unitario: i.unitPrice,
        total: dinheiro(i.quantity * i.unitPrice),
        obs: i.notes?.trim() || undefined,
      })),
      pagamentos: registrar.map((p) => ({ forma: p.method === "FIADO" ? "Fiado" : rotuloPagamento(p.method), valor: p.amount })),
      whatsappTexto: texto,
    },
  };
}

/* ---------- pedidos em aberto ---------- */

export interface PedidoAberto {
  id: string;
  numero: number | null;
  cliente: string;
  clientId: string;
  telefone: string | null;
  total: number;
  jaPago: number;
  criado: string;
  resumo: string;
}

export async function listarPedidosAbertos(): Promise<PedidoAberto[]> {
  if (!(await sessaoVendedor())) return [];
  const qs = await prisma.quote.findMany({
    where: { isPosSale: true, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      client: { select: { id: true, name: true, phone: true } },
      items: { select: { description: true, quantity: true } },
      transactions: { where: { type: "INCOME", status: "PAID" }, select: { amount: true } },
    },
  });
  return qs.map((q) => ({
    id: q.id,
    numero: q.number,
    cliente: q.client.name,
    clientId: q.client.id,
    telefone: q.client.phone,
    total: q.finalPrice,
    jaPago: dinheiro(q.transactions.reduce((s, t) => s + t.amount, 0)),
    criado: q.createdAt.toISOString(),
    resumo: q.items.map((i) => `${i.quantity}x ${i.description}`).join(" • "),
  }));
}

export interface PedidoCarregado {
  id: string;
  numero: number | null;
  clientId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  sellerId: string | null;
  jaPago: number;
  desconto: number;
  itens: ItemVenda[];
}

export async function carregarPedido(id: string): Promise<PedidoCarregado | null> {
  if (!(await sessaoVendedor())) return null;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      items: true,
      transactions: { where: { type: "INCOME", status: "PAID" }, select: { amount: true } },
    },
  });
  if (!q || q.status !== "OPEN") return null;
  const subtotal = dinheiro(q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  return {
    id: q.id,
    numero: q.number,
    clientId: q.client.id,
    clienteNome: q.client.name,
    clienteTelefone: q.client.phone,
    sellerId: q.sellerId,
    jaPago: dinheiro(q.transactions.reduce((s, t) => s + t.amount, 0)),
    desconto: dinheiro(Math.max(0, subtotal - q.finalPrice)),
    itens: q.items.map((i) => ({
      productId: i.productId,
      name: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
    })),
  };
}

export async function cancelarPedido(id: string): Promise<{ ok: boolean; erro?: string }> {
  if (!(await sessaoVendedor())) return { ok: false, erro: "Sem permissao." };
  const q = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
  if (!q || q.status !== "OPEN") return { ok: false, erro: "Esse pedido ja foi fechado ou nao existe." };
  const pagos = await prisma.financialTransaction.count({ where: { quoteId: id, type: "INCOME", status: "PAID" } });
  if (pagos > 0) return { ok: false, erro: "Esse pedido ja tem pagamento registrado. Fale com o administrador para estornar." };
  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({ where: { quoteId: id } }),
    prisma.serviceOrder.deleteMany({ where: { quoteId: id } }),
    prisma.quote.update({ where: { id }, data: { status: "CANCELLED" } }),
  ]);
  revalidatePath("/pdv");
  revalidatePath("/pcp");
  return { ok: true };
}
