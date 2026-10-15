import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportarClientView } from "./ImportarClientView";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const sessao = await getSession();
  if (!sessao) redirect("/login");
  if (sessao.role !== "ADMIN") redirect("/");
  return <ImportarClientView />;
}
