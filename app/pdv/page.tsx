import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VendaRapida, type ProdutoPdv } from "./VendaRapida";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN", "MANAGER", "SELLER"].includes(session.role)) redirect("/");

  const [produtos, vendedores, empresa] = await Promise.all([
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
      select: { companyName: true, city: true, pixKeySicoob: true, pixKeyBradesco: true },
    }),
  ]);

  const lista: ProdutoPdv[] = produtos.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    category: p.category,
    price: p.price,
    cost: p.cost,
    unit: p.unit,
  }));

  return (
    <VendaRapida
      produtos={lista}
      vendedores={vendedores}
      vendedorInicial={session.id}
      empresa={empresa?.companyName || "Foto & Gráficos"}
      cidade={empresa?.city || "Araranguá"}
      pixSicoob={empresa?.pixKeySicoob || null}
      pixBradesco={empresa?.pixKeyBradesco || null}
    />
  );
}
