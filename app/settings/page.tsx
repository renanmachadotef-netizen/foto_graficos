import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { COMPANY, ensureInitialData } from "@/lib/company";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureInitialData();
  const company = COMPANY;

  const settings = (await prisma.companySettings.findFirst({
  })) || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurações da Empresa ({company.shortName})
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure a identidade, CNPJ, dados de contato e chave PIX para {company.name}.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
