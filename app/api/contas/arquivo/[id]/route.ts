import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSession();
  if (!sessao || !["ADMIN", "MANAGER"].includes(sessao.role)) {
    return new Response("Sem permissao", { status: 403 });
  }
  const { id } = await params;
  const f = await prisma.billFile.findUnique({ where: { id } });
  if (!f) return new Response("Arquivo nao encontrado", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
