import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VendaRapida, type ProdutoPdv } from "./VendaRapida";

export const dynamic = "force-dynamic";

const desde = (dias: number) => new Date(Date.now() - dias * 86400000);

export default async function PdvPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN", "MANAGER", "SELLER"].includes(session.role)) redirect("/");

  const [produtos, vendedores, empresa, fotos, vendidos] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, category: true, price: true, cost: true, unit: true },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.companySettings.findFirst({
      select: { companyName: true, city: true, pixKeySicoob: true, pixKeyBradesco: true, staffDiscountMax: true },
    }),
    prisma.productPhoto.findMany({ select: { productId: true } }),
    // os 8 produtos que mais saíram nos últimos 90 dias
    prisma.quoteItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, quote: { createdAt: { gte: desde(90) } } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 8,
    }),
  ]);

  const comFoto = new Set(fotos.map((f) => f.productId));
  const lista: ProdutoPdv[] = produtos.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    category: p.category,
    price: p.price,
    cost: p.cost,
    unit: p.unit,
    temFoto: comFoto.has(p.id),
  }));
  const maisVendidos = vendidos.map((v) => v.productId).filter((id): id is string => !!id);

  return (
    <VendaRapida
      produtos={lista}
      maisVendidos={maisVendidos}
      vendedores={vendedores}
      vendedorInicial={session.id}
      empresa={empresa?.companyName || "Foto & Gráficos"}
      cidade={empresa?.city || "Araranguá"}
      pixSicoob={empresa?.pixKeySicoob || null}
      pixBradesco={empresa?.pixKeyBradesco || null}
      pedidoInicial={pedido || null}
      limiteDesconto={session.role === "SELLER" ? (empresa?.staffDiscountMax ?? 50) : null}
    />
  );
}
