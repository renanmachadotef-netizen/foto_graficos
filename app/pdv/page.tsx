import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ensureDefaultProducts } from "./actions";
import { PdvClientView } from "./PdvClientView";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureDefaultProducts();

  const [products, materials, clients, companySettings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.companySettings.findFirst(),
  ]);

  return (
    <PdvClientView
      initialProducts={products}
      materials={materials}
      clients={clients}
      companySettings={companySettings}
      userName={session.name}
    />
  );
}
