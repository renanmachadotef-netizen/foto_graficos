import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CaixaView } from "./CaixaView";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!["ADMIN", "MANAGER", "SELLER"].includes(s.role)) redirect("/");
  return <CaixaView />;
}
