import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lerClientes, lerProdutos } from "@/lib/nex-import";
import { aplicarImportacao, previaBanco } from "@/lib/nex-apply";

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
    if (!bufC && !bufP) {
      return NextResponse.json({ ok: false, erro: "Escolha pelo menos uma planilha (clientes ou produtos)." }, { status: 400 });
    }

    const c = bufC ? lerClientes(bufC) : null;
    const p = bufP ? lerProdutos(bufP) : null;
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
      });
    }

    const relatorio = await aplicarImportacao({
      clientes: c?.clientes ?? [],
      produtos: p?.produtos ?? [],
      removerDemo,
    });
    return NextResponse.json({ ok: true, relatorio });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "Nao consegui ler a planilha." },
      { status: 400 },
    );
  }
}
