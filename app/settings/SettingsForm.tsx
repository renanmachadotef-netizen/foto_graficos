"use client";

import { useState } from "react";
import { updateCompanySettings } from "@/app/financial/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Building, ShieldCheck } from "lucide-react";

export function SettingsForm({ settings }: { settings: any }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || "",
    document: settings?.document || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    address: settings?.address || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    await updateCompanySettings(formData);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <Card className="max-w-2xl border-slate-200 bg-white shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-lg font-bold text-slate-900">Identidade da Empresa</CardTitle>
          </div>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Estes dados serão utilizados para gerar o cabeçalho das propostas comerciais, orçamentos e relatórios.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSave} className="space-y-4">
          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Configurações salvas com sucesso no banco de dados!
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Nome da Gráfica / Razão Social</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Ex: Foto & Gráficos Comunicação Visual"
              className="text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">CNPJ / CPF</Label>
              <Input
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Telefone / WhatsApp</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">E-mail Comercial</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@fotograficos.com.br"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Endereço Completo</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ex: Av. Principal, 1000 - Centro, Cidade - UF"
              className="text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 mt-2"
          >
            {loading ? "Salvando no Banco..." : "Salvar Configurações da Empresa"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
