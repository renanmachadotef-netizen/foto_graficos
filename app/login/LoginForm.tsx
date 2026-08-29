"use client";

import { useState } from "react";
import { loginAction, quickLoginRole } from "./actions";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { TenantConfig } from "@/lib/tenant";
import {
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Printer,
  ArrowRight,
  Lock,
  Mail,
  Wine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LoginFormProps {
  tenantConfig: TenantConfig;
}

export function LoginForm({ tenantConfig }: LoginFormProps) {
  const isPuraBrasil = tenantConfig.id === "PURABRASIL";

  const defaultEmail = isPuraBrasil ? "admin@purabrasil.com.br" : "admin@fotograficos.com.br";
  const defaultPassword = "admin123";

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickProfiles: { role: Role; title: string; subtitle: string; icon: any; variant: any }[] = isPuraBrasil
    ? [
        {
          role: "ADMIN",
          title: "Administrador Geral (Alambique)",
          subtitle: "Gestão completa da cachaçaria, custos de barris, alambique e financeiro",
          icon: ShieldCheck,
          variant: "admin",
        },
        {
          role: "MANAGER",
          title: "Mestre Alambiqueiro / Gerente",
          subtitle: "Controle de dornas, envase, estoque de garrafas/líquidos e PCP",
          icon: Wine,
          variant: "manager",
        },
        {
          role: "SELLER",
          title: "Vendas & Distribuição",
          subtitle: "PDV de garrafas, pedidos de atacado/bares e recebimentos",
          icon: ShoppingBag,
          variant: "seller",
        },
      ]
    : [
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
    <div
      className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 ${
        isPuraBrasil
          ? "bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900"
          : "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950"
      }`}
    >
      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand Identity & Quick Profile Switcher */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-md">
              {isPuraBrasil ? <Wine className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{tenantConfig.name} • Gestão Inteligente</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {tenantConfig.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg">
              {tenantConfig.tagline}
            </p>
          </div>

          {/* Quick Demo Access Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Acesso Rápido por Perfil (1 Clique):
              </span>
              <span className="text-[11px] text-slate-400">Ambiente Seguro</span>
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
                    className={`group relative p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isPuraBrasil
                        ? "bg-stone-900/60 hover:bg-stone-800/80 border-stone-800 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"
                        : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isPuraBrasil ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-400 transition-colors">
                          {p.title}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{p.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Traditional Login Card */}
        <div className="lg:col-span-5">
          <Card
            className={`border shadow-2xl backdrop-blur-xl ${
              isPuraBrasil
                ? "bg-stone-900/90 border-stone-800"
                : "bg-slate-900/90 border-slate-800"
            }`}
          >
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className={`w-5 h-5 ${isPuraBrasil ? "text-amber-400" : "text-indigo-400"}`} />
                Entrar com E-mail
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Digite suas credenciais de acesso para a empresa <strong>{tenantConfig.name}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    E-mail
                  </Label>
                  <Input
                    type="email"
                    placeholder="seuemail@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 text-sm ${
                      isPuraBrasil ? "focus:border-amber-500" : "focus:border-indigo-500"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Senha
                    </Label>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 text-sm ${
                      isPuraBrasil ? "focus:border-amber-500" : "focus:border-indigo-500"
                    }`}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full text-white font-semibold py-2.5 rounded-lg shadow-lg text-sm mt-2 cursor-pointer ${
                    isPuraBrasil
                      ? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/20"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-500/20"
                  }`}
                >
                  {loading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-500">
                  {tenantConfig.name} © 2026 — Gestão Empresarial Isolada
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
