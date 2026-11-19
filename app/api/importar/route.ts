import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lerClientes, lerProdutos, lerEstoqueCustos } from "@/lib/nex-import";
import { aplicarContas, aplicarCustos, lerContas, previaContas, previaCustos } from "@/lib/nex-contas";
import { aplicarImportacao, previaBanco } from "@/lib/nex-apply";
import { aplicarPedidos, lerPedidos, previaPedidos } from "@/lib/nex-pedidos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;

async function arquivo(form: FormData, campo: string): Promise<Buffer | null> {
  const f = form.get(campo);
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_BYTES) throw new Error(`O arquivo de ${campo} e grande demais.`);
  return Buffer.from(await f.arrayBuffer());
}

/** acao=previa: le as planilhas e mostra o que vai entrar. acao=aplicar: grava no banco. So o administrador. */
export async function POST(req: Request) {
  const sessao = await getSession();
  if (!sessao || sessao.role !== "ADMIN") {
    return NextResponse.json({ ok: false, erro: "So o administrador pode importar dados." }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const acao = form.get("acao") === "aplicar" ? "aplicar" : "previa";
    const removerDemo = form.get("removerDemo") === "1";

    const bufC = await arquivo(form, "clientes");
    const bufP = await arquivo(form, "produtos");
    const bufO = await arquivo(form, "pedidos");
    const filaProducao = form.get("filaProducao") === "1";
    const bufT = await arquivo(form, "contas");
    const bufE = await arquivo(form, "estoque");
    const incluirAbertas = form.get("incluirAbertas") === "1";
    if (!bufC && !bufP && !bufO && !bufT && !bufE) {
      return NextResponse.json({ ok: false, erro: "Escolha pelo menos uma planilha." }, { status: 400 });
    }
    const t = bufT ? lerContas(bufT) : null;
    if (t && t.contas.length === 0) {
      return NextResponse.json({ ok: false, erro: "Nao achei contas nessa planilha. Ela veio do NEX (Contas a pagar)?" }, { status: 400 });
    }
    const e = bufE ? lerEstoqueCustos(bufE) : null;

    const c = bufC ? lerClientes(bufC) : null;
    const p = bufP ? lerProdutos(bufP) : null;
    const o = bufO ? lerPedidos(bufO) : null;
    if (o && o.resumo.total === 0) {
      return NextResponse.json({ ok: false, erro: "Nao achei pedidos nessa planilha. Ela veio do NEX (Pedidos em aberto)?" }, { status: 400 });
    }
    if (c && c.resumo.unicos === 0) {
      return NextResponse.json({ ok: false, erro: "Nao achei clientes nessa planilha. Ela veio do NEX (Clientes)?" }, { status: 400 });
    }
    if (p && p.resumo.total === 0) {
      return NextResponse.json({ ok: false, erro: "Nao achei produtos nessa planilha. Ela veio do NEX (Produtos)?" }, { status: 400 });
    }

    if (acao === "previa") {
      const banco = await previaBanco(c?.clientes ?? [], p?.produtos ?? []);
      return NextResponse.json({
        ok: true,
        clientes: c?.resumo ?? null,
        produtos: p?.resumo ?? null,
        banco,
        pedidos: o ? { resumo: o.resumo, previa: await previaPedidos(o.pedidos) } : null,
        contas: t ? { resumo: t.resumo, previa: await previaContas(t.contas, incluirAbertas) } : null,
        custos: e ? { total: e.custos.length, aAtualizar: await previaCustos(e.custos) } : null,
      });
    }

    const relatorio = await aplicarImportacao({
      clientes: c?.clientes ?? [],
      produtos: p?.produtos ?? [],
      removerDemo,
    });
    const pedidos = o ? await aplicarPedidos({ pedidos: o.pedidos, filaProducao }) : null;
    const contas = t ? await aplicarContas(t.contas, incluirAbertas) : null;
    const custos = e ? await aplicarCustos(e.custos) : null;
    return NextResponse.json({ ok: true, relatorio, pedidos, contas, custos });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "Nao consegui ler a planilha." },
      { status: 400 },
    );
  }
}
