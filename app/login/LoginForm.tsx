"use client";

import { useState } from "react";
import { loginAction, quickLoginRole } from "./actions";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { CompanyConfig } from "@/lib/company";
import {
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Printer,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LoginFormProps {
  company: CompanyConfig;
}

export function LoginForm({ company }: LoginFormProps) {
  const defaultEmail = "admin@fotograficos.com.br";
  const defaultPassword = "admin123";

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickProfiles: { role: Role; title: string; subtitle: string; icon: any; variant: any }[] = [
        {
          role: "ADMIN",
          title: "Administrador (Full)",
          subtitle: "Acesso total a custos, equipe, máquinas, configurações e usuários",
          icon: ShieldCheck,
          variant: "admin",
        },
        {
          role: "MANAGER",
          title: "Gerente Operacional",
          subtitle: "Gestão de estoque, PCP, aprovação de orçamentos e financeiro",
          icon: UserCheck,
          variant: "manager",
        },
        {
          role: "SELLER",
          title: "Vendedor Comercial",
          subtitle: "Lança vendas/orçamentos, cadastra clientes e dá baixa em recebimentos",
          icon: ShoppingBag,
          variant: "seller",
        },
        {
          role: "PRODUCTION",
          title: "Operador de Produção",
          subtitle: "Foco no PCP, fila de impressão e status de produção",
          icon: Printer,
          variant: "production",
        },
      ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await loginAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  async function handleQuickLogin(role: Role) {
    setLoading(true);
    setError(null);
    const res = await quickLoginRole(role);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-background text-foreground">
      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Esquerda: marca e acesso rapido por perfil */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{company.name} • Gestão Inteligente</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">{company.name}</h1>
            <p className="text-base text-muted-foreground max-w-lg">{company.tagline}</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Acesso rápido por perfil
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {quickProfiles.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.role}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(p.role)}
                    className="group relative p-4 rounded-2xl border border-border bg-card text-left shadow-xs transition-all duration-150 cursor-pointer hover:border-primary hover:shadow-md active:scale-[0.985] disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-accent text-accent-foreground">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm text-card-foreground">{p.title}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{p.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Direita: entrar com e-mail */}
        <div className="lg:col-span-5">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Entrar com e-mail
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Digite suas credenciais de acesso para <strong>{company.name}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </Label>
                  <Input
                    type="email"
                    placeholder="seuemail@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    Senha
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" size="lg" disabled={loading} className="w-full mt-2 cursor-pointer">
                  {loading ? "Entrando..." : "Entrar no sistema"}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">{company.name} © 2026</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
