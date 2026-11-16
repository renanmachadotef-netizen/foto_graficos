import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Arquivo da arte, aberto pelo link do cliente (sem login: o token e a chave). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(token)) return new Response("Nao encontrado.", { status: 404 });
  const a = await prisma.quoteArt.findUnique({ where: { token }, select: { data: true, mime: true, name: true } });
  if (!a) return new Response("Nao encontrado.", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: {
      "Content-Type": a.mime,
      "Content-Disposition": `inline; filename="${a.name.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
