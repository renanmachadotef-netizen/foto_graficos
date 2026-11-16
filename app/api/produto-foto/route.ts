import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/** Gerente ou administrador troca a foto do produto (a tela ja reduz a imagem antes de enviar). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER"].includes(s.role)) return NextResponse.json({ ok: false, erro: "Sem permissao." }, { status: 403 });
  const form = await req.formData();
  const productId = String(form.get("productId") ?? "");
  const arquivo = form.get("file");
  if (!(arquivo instanceof File)) return NextResponse.json({ ok: false, erro: "Nenhum arquivo enviado." }, { status: 400 });
  if (!TIPOS.includes(arquivo.type)) return NextResponse.json({ ok: false, erro: "Envie JPG, PNG ou WebP." }, { status: 400 });
  if (arquivo.size > MAX_BYTES) return NextResponse.json({ ok: false, erro: "Foto grande demais (maximo 2 MB)." }, { status: 400 });
  if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) return NextResponse.json({ ok: false, erro: "Produto nao encontrado." }, { status: 404 });
  const data = Buffer.from(await arquivo.arrayBuffer());
  await prisma.productPhoto.upsert({ where: { productId }, create: { productId, mime: arquivo.type, data }, update: { mime: arquivo.type, data } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER"].includes(s.role)) return NextResponse.json({ ok: false, erro: "Sem permissao." }, { status: 403 });
  const productId = new URL(req.url).searchParams.get("productId") ?? "";
  await prisma.productPhoto.deleteMany({ where: { productId } });
  return NextResponse.json({ ok: true });
}
