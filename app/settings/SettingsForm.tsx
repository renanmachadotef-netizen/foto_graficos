"use client";
import { useState } from "react";
import { updateCompanySettings } from "@/app/financial/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export function SettingsForm({ settings }: { settings: any }) {
  const [loading, setLoading] = useState(false);
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
    await updateCompanySettings(formData);
    setLoading(false);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Identidade da Empresa</CardTitle>
        <CardDescription>Estes dados serão utilizados para gerar o cabeçalho das propostas em PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Gráfica / Razão Social</Label>
            <Input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="Ex: Gráfica Rápida Silva" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ / CPF</Label>
              <Input value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail Comercial</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo</Label>
            <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ex: Rua das Flores, 123 - Centro" />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? "Salvando..." : <><Check size={16} className="mr-2"/> Salvar Configurações</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
