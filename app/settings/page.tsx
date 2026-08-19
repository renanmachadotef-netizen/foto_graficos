import { PrismaClient } from "@prisma/client";
import { SettingsForm } from "./SettingsForm";

const prisma = new PrismaClient();

export default async function SettingsPage() {
  const settings = await prisma.companySettings.findFirst() || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Configurações Gerais</h1>
        <p className="text-muted-foreground">Configure os dados do seu sistema e das suas propostas.</p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
