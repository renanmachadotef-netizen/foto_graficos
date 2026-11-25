"use client";

import { useState } from "react";
import { createClient } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, UserPlus } from "lucide-react";

export function ClientForm() {
  const [aberto, setAberto] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      await createClient({ name, document, phone, email, birthDate });
      setSalvo(name.trim());
      setName("");
      setDocument("");
      setPhone("");
      setEmail("");
      setBirthDate("");
      setAberto(false);
    } catch {
      setErro("Não foi possível salvar o cliente. Confira os dados e tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        onClick={() => { setSalvo(null); setErro(null); setAberto(true); }}
        className="h-11 gap-2 cursor-pointer"
      >
        <UserPlus /> Novo cliente
      </Button>
      {salvo && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={16} /> {salvo} foi cadastrado.
        </p>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Só o nome é obrigatório. O resto pode ser preenchido depois.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cli-nome" className="text-sm font-semibold">Nome completo ou empresa *</Label>
              <Input id="cli-nome" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cli-fone" className="text-sm font-semibold">Telefone / WhatsApp</Label>
              <Input id="cli-fone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 48999998888" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cli-nasc" className="text-sm font-semibold">Aniversário</Label>
              <Input id="cli-nasc" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Usado na lista de aniversariantes e nos sorteios.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cli-doc" className="text-sm font-semibold">CPF / CNPJ</Label>
              <Input id="cli-doc" value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cli-email" className="text-sm font-semibold">E-mail</Label>
              <Input id="cli-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>

            {erro && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {erro}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)} className="h-11 cursor-pointer">Cancelar</Button>
              <Button type="submit" disabled={loading} className="h-11 cursor-pointer">
                {loading ? "Salvando…" : "Cadastrar cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
