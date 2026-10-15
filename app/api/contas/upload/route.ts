import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { lerBoletoDoArquivo } from "@/lib/boleto-ia";

export const dynamic = "force-dynamic";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024;

/** Recebe UM arquivo por vez. Sem transactionId: le o boleto e cria a conta "para conferir".
 *  Com transactionId: so anexa o arquivo a conta existente. */
export async function POST(req: Request) {
  const sessao = await getSession();
  if (!sessao || !["ADMIN", "MANAGER"].includes(sessao.role)) {
    return NextResponse.json({ ok: false, erro: "Sem permissao." }, { status: 403 });
  }

  const form = await req.formData();
  const arquivo = form.get("file");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ ok: false, erro: "Nenhum arquivo enviado." }, { status: 400 });
  }
  const mime = arquivo.type || "application/octet-stream";
  if (!TIPOS.includes(mime)) {
    return NextResponse.json({ ok: false, erro: "Envie PDF ou foto (JPG, PNG)." }, { status: 400 });
  }
  if (arquivo.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, erro: "Arquivo grande demais (maximo 10 MB)." }, { status: 400 });
  }
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const transactionId = (form.get("transactionId") as string | null) || null;

  if (transactionId) {
    const existe = await prisma.financialTransaction.findUnique({ where: { id: transactionId }, select: { id: true } });
    if (!existe) return NextResponse.json({ ok: false, erro: "Conta nao encontrada." }, { status: 404 });
    const f = await prisma.billFile.create({
      data: { transactionId, name: arquivo.name.slice(0, 120), mime, size: bytes.length, data: bytes },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: transactionId, fileId: f.id });
  }

  const dados = await lerBoletoDoArquivo(bytes, mime);

  // mesma linha digitavel ja cadastrada = boleto repetido
  if (dados.linha) {
    const repetido = await prisma.financialTransaction.findFirst({
      where: { type: "EXPENSE", barcode: dados.linha },
      select: { id: true, description: true },
    });
    if (repetido) {
      return NextResponse.json({ ok: true, duplicado: true, id: repetido.id, descricao: repetido.description, dados });
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const conta = await prisma.financialTransaction.create({
    data: {
      description: dados.descricao || dados.fornecedor || arquivo.name.replace(/\.[^.]+$/, "").slice(0, 80),
      supplier: dados.fornecedor,
      amount: dados.valor ?? 0,
      type: "EXPENSE",
      status: "PENDING",
      category: dados.categoria,
      paymentMethod: "BOLETO",
      dueDate: new Date(`${dados.vencimento || hoje}T12:00:00`),
      barcode: dados.linha,
      needsReview: true,
      files: {
        create: { name: arquivo.name.slice(0, 120), mime, size: bytes.length, data: bytes },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: conta.id, dados });
}
