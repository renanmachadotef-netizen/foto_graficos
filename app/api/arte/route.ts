import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

/** A loja envia uma versao da arte de um pedido aberto. Devolve o link para o cliente aprovar. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER", "SELLER"].includes(s.role)) return NextResponse.json({ ok: false, erro: "Sem permissao." }, { status: 403 });

  const form = await req.formData();
  const quoteId = String(form.get("quoteId") ?? "");
  const arquivo = form.get("file");
  if (!(arquivo instanceof File)) return NextResponse.json({ ok: false, erro: "Nenhum arquivo enviado." }, { status: 400 });
  if (!TIPOS.includes(arquivo.type)) return NextResponse.json({ ok: false, erro: "Envie JPG, PNG, WebP ou PDF." }, { status: 400 });
  if (arquivo.size > MAX_BYTES) return NextResponse.json({ ok: false, erro: "Arquivo grande demais (maximo 10 MB)." }, { status: 400 });

  const q = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true } });
  if (!q || q.status !== "OPEN") return NextResponse.json({ ok: false, erro: "So pedido em aberto recebe arte." }, { status: 400 });

  const ultima = await prisma.quoteArt.aggregate({ where: { quoteId }, _max: { version: true } });
  const arte = await prisma.quoteArt.create({
    data: {
      quoteId,
      token: randomUUID(),
      name: arquivo.name.slice(0, 120) || "arte",
      mime: arquivo.type,
      size: arquivo.size,
      data: Buffer.from(await arquivo.arrayBuffer()),
      version: (ultima._max.version ?? 0) + 1,
      uploadedBy: s.name,
    },
    select: { token: true },
  });
  return NextResponse.json({ ok: true, token: arte.token });
}
