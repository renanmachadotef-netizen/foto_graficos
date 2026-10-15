import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HistoricoVendas } from "./HistoricoVendas";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const sessao = await getSession();
  if (!sessao) redirect("/login");
  if (!["ADMIN", "MANAGER", "SELLER"].includes(sessao.role)) redirect("/");

  const empresa = await prisma.companySettings.findFirst({ select: { companyName: true } });

  return (
    <HistoricoVendas
      papel={sessao.role as "ADMIN" | "MANAGER" | "SELLER"}
      empresa={empresa?.companyName || "Foto & Gráficos"}
    />
  );
}
