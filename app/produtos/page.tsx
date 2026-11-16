import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProdutosView, type ProdutoLinha } from "./ProdutosView";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const s = await getSession();
  if (!s || !["ADMIN", "MANAGER", "SELLER"].includes(s.role)) redirect("/login");

  const [lista, comFoto] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.productPhoto.findMany({ select: { productId: true } }),
  ]);
  const fotos = new Set(comFoto.map((x) => x.productId));
  const produtos: ProdutoLinha[] = lista.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    category: p.category,
    unit: p.unit,
    price: p.price,
    cost: p.cost,
    brand: p.brand,
    description: p.description,
    active: p.active,
    trackStock: p.trackStock,
    stockQty: p.stockQty,
    temFoto: fotos.has(p.id),
  }));

  return <ProdutosView produtos={produtos} gestor={s.role === "ADMIN" || s.role === "MANAGER"} />;
}
