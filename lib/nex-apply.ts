import { prisma } from "./prisma";
import { normalizarBusca } from "./busca";
import {
  CLIENTES_DEMO,
  PRODUTOS_DEMO,
  dataIso,
  type ClienteNex,
  type ProdutoNex,
} from "./nex-import";

export interface PreviaBanco {
  clientesNovos: number;
  clientesExistentes: number;
  produtosNovos: number;
  produtosExistentes: number;
  fiadoJaImportado: number;
  demoClientes: number;
  demoProdutos: number;
}

export interface RelatorioImportacao {
  clientesNovos: number;
  clientesAtualizados: number;
  fiadoCriado: number;
  fiadoJaExistia: number;
  totalFiadoCriado: number;
  creditosAtualizados: number;
  produtosNovos: number;
  produtosJaExistiam: number;
  demoClientesRemovidos: number;
  demoProdutosRemovidos: number;
}

const MARCA_SALDO = "nex-saldo:";

function fatias<T>(lista: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho));
  return out;
}

/** O que ja existe no banco, para mostrar "novos x ja existentes" antes de importar. */
export async function previaBanco(clientes: ClienteNex[], produtos: ProdutoNex[]): Promise<PreviaBanco> {
  const codigosC = clientes.map((c) => c.codigo);
  const codigosP = produtos.map((p) => p.codigo);
  const [existentesC, existentesP, saldos, demoC, demoP] = await Promise.all([
    codigosC.length ? prisma.client.findMany({ where: { code: { in: codigosC } }, select: { code: true } }) : [],
    codigosP.length ? prisma.product.findMany({ where: { code: { in: codigosP } }, select: { code: true } }) : [],
    prisma.financialTransaction.count({ where: { notes: { startsWith: MARCA_SALDO } } }),
    prisma.client.count({ where: { name: { in: CLIENTES_DEMO } } }),
    prisma.product.count({ where: { name: { in: PRODUTOS_DEMO } } }),
  ]);
  const setC = new Set(existentesC.map((c) => c.code));
  const setP = new Set(existentesP.map((p) => p.code));
  return {
    clientesNovos: codigosC.filter((c) => !setC.has(c)).length,
    clientesExistentes: codigosC.filter((c) => setC.has(c)).length,
    produtosNovos: codigosP.filter((c) => !setP.has(c)).length,
    produtosExistentes: codigosP.filter((c) => setP.has(c)).length,
    fiadoJaImportado: saldos,
    demoClientes: demoC,
    demoProdutos: demoP,
  };
}

function dadosCliente(c: ClienteNex) {
  const nasc = c.nascimento ? dataIso(c.nascimento) : null;
  return {
    name: c.nome,
    code: c.codigo,
    document: c.documento,
    phone: c.telefone,
    address: c.endereco,
    gender: c.genero,
    birthDate: nasc,
    birthDay: nasc ? Number(c.nascimento!.slice(8, 10)) : null,
    birthMonth: nasc ? Number(c.nascimento!.slice(5, 7)) : null,
    notes: c.observacao,
    status: "Ativo",
    credit: c.saldo > 0 ? c.saldo : 0,
    searchKey: normalizarBusca(c.nome, c.telefone, c.documento, c.codigo),
  };
}

export async function aplicarImportacao(opcoes: {
  clientes: ClienteNex[];
  produtos: ProdutoNex[];
  removerDemo: boolean;
}): Promise<RelatorioImportacao> {
  const rel: RelatorioImportacao = {
    clientesNovos: 0,
    clientesAtualizados: 0,
    fiadoCriado: 0,
    fiadoJaExistia: 0,
    totalFiadoCriado: 0,
    creditosAtualizados: 0,
    produtosNovos: 0,
    produtosJaExistiam: 0,
    demoClientesRemovidos: 0,
    demoProdutosRemovidos: 0,
  };

  // 1) exemplos que vieram com o sistema (so os que nunca foram usados)
  if (opcoes.removerDemo) {
    const demoC = await prisma.client.findMany({
      where: { name: { in: CLIENTES_DEMO }, quotes: { none: {} }, transactions: { none: {} } },
      select: { id: true },
    });
    if (demoC.length) {
      const r = await prisma.client.deleteMany({ where: { id: { in: demoC.map((c) => c.id) } } });
      rel.demoClientesRemovidos = r.count;
    }
    const r2 = await prisma.product.deleteMany({ where: { name: { in: PRODUTOS_DEMO } } });
    rel.demoProdutosRemovidos = r2.count;
  }

  // 2) clientes: novos em lote, existentes atualizados
  if (opcoes.clientes.length) {
    const existentes = await prisma.client.findMany({
      where: { code: { in: opcoes.clientes.map((c) => c.codigo) } },
      select: {
        id: true,
        code: true,
        name: true,
        document: true,
        phone: true,
        address: true,
        gender: true,
        birthDate: true,
        credit: true,
        searchKey: true,
      },
    });
    const idPorCodigo = new Map(existentes.map((e) => [e.code!, e.id]));
    const atuais = new Map(existentes.map((e) => [e.code!, e]));
    const novos = opcoes.clientes.filter((c) => !idPorCodigo.has(c.codigo));
    for (const lote of fatias(novos, 500)) {
      await prisma.client.createMany({ data: lote.map(dadosCliente) });
    }
    rel.clientesNovos = novos.length;

    // so mexe nos clientes que realmente mudaram (reimportar e rapido e nao pisa no que foi editado aqui)
    const atualizar = opcoes.clientes.filter((c) => {
      const e = atuais.get(c.codigo);
      if (!e) return false;
      const d = dadosCliente(c);
      return (
        e.name !== d.name ||
        e.credit !== d.credit ||
        e.searchKey !== d.searchKey ||
        (d.document !== null && e.document !== d.document) ||
        (d.phone !== null && e.phone !== d.phone) ||
        (d.address !== null && e.address !== d.address) ||
        (d.gender !== null && e.gender !== d.gender) ||
        (d.birthDate !== null && e.birthDate?.getTime() !== d.birthDate.getTime())
      );
    });
    for (const lote of fatias(atualizar, 40)) {
      await Promise.all(
        lote.map((c) => {
          const d = dadosCliente(c);
          return prisma.client.update({
            where: { id: idPorCodigo.get(c.codigo)! },
            // nao apaga o que o usuario ja preencheu aqui com um campo vazio do NEX
            data: {
              name: d.name,
              document: d.document ?? undefined,
              phone: d.phone ?? undefined,
              address: d.address ?? undefined,
              gender: d.gender ?? undefined,
              birthDate: d.birthDate ?? undefined,
              birthDay: d.birthDay ?? undefined,
              birthMonth: d.birthMonth ?? undefined,
              credit: d.credit,
              searchKey: d.searchKey,
            },
          });
        }),
      );
    }
    rel.clientesAtualizados = atualizar.length;
    rel.creditosAtualizados = opcoes.clientes.filter((c) => c.saldo > 0).length;

    // 3) fiado antigo: um "a receber" por cliente devedor, criado uma unica vez
    const devedores = opcoes.clientes.filter((c) => c.saldo < 0);
    if (devedores.length) {
      const todos = await prisma.client.findMany({
        where: { code: { in: devedores.map((d) => d.codigo) } },
        select: { id: true, code: true },
      });
      const idDe = new Map(todos.map((t) => [t.code!, t.id]));
      const jaTem = await prisma.financialTransaction.findMany({
        where: { notes: { in: devedores.map((d) => MARCA_SALDO + d.codigo) } },
        select: { notes: true },
      });
      const setJa = new Set(jaTem.map((j) => j.notes));
      const hoje = dataIso(new Date().toISOString().slice(0, 10));
      const novas = devedores
        .filter((d) => !setJa.has(MARCA_SALDO + d.codigo) && idDe.has(d.codigo))
        .map((d) => ({
          description: "Fiado antigo (saldo trazido do NEX)",
          amount: Math.round(-d.saldo * 100) / 100,
          type: "INCOME",
          status: "PENDING",
          category: "Fiado antigo",
          dueDate: hoje,
          clientId: idDe.get(d.codigo)!,
          notes: MARCA_SALDO + d.codigo,
        }));
      for (const lote of fatias(novas, 500)) {
        await prisma.financialTransaction.createMany({ data: lote });
      }
      rel.fiadoCriado = novas.length;
      rel.fiadoJaExistia = devedores.length - novas.length;
      rel.totalFiadoCriado = Math.round(novas.reduce((s, n) => s + n.amount, 0) * 100) / 100;
    }
  }

  // 4) produtos: entram os novos; os que ja existem ficam como estao (preco/custo podem ter sido ajustados aqui)
  if (opcoes.produtos.length) {
    const existentes = await prisma.product.findMany({
      where: { code: { in: opcoes.produtos.map((p) => p.codigo) } },
      select: { code: true },
    });
    const setP = new Set(existentes.map((e) => e.code));
    const novos = opcoes.produtos.filter((p) => !setP.has(p.codigo));
    for (const lote of fatias(novos, 300)) {
      await prisma.product.createMany({
        data: lote.map((p) => ({
          name: p.nome,
          code: p.codigo,
          category: p.categoria,
          price: p.preco,
          cost: p.custo,
          unit: p.unidade,
          brand: p.marca,
          description: p.observacao,
          active: p.ativo,
        })),
      });
    }
    rel.produtosNovos = novos.length;
    rel.produtosJaExistiam = opcoes.produtos.length - novos.length;
  }

  return rel;
}
