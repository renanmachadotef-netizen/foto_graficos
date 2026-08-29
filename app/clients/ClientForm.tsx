"use client";

import { useState } from "react";
import { createClient } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cake } from "lucide-react";

export function ClientForm() {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createClient({ name, document, phone, email, birthDate });
      setName("");
      setDocument("");
      setPhone("");
      setEmail("");
      setBirthDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-xs">
      <CardHeader className="bg-slate-50/80 border-b pb-4">
        <CardTitle className="text-lg font-bold text-slate-800">Novo Cliente</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome Completo / Empresa *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 48999998888" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-pink-700">
              <Cake className="w-3.5 h-3.5" /> Data de Nascimento (Aniversário)
            </Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="border-pink-200 focus:border-pink-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">CPF / CNPJ</Label>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">
            {loading ? "Cadastrando..." : "Cadastrar Cliente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
