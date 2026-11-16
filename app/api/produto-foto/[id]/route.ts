import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Foto do produto, so para quem esta logado na equipe. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Nao autorizado", { status: 401 });
  const { id } = await params;
  const f = await prisma.productPhoto.findUnique({ where: { productId: id } });
  if (!f) return new Response("Nao encontrada", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(f.data), {
    headers: { "Content-Type": f.mime, "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" },
  });
}
