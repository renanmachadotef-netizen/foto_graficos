import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = (await prisma.companySettings.findFirst()) || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurações Gerais
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure a identidade visual da sua gráfica e os dados das propostas comerciais.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
