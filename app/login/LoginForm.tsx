"use client";

import { useState } from "react";
import { loginAction, quickLoginRole } from "./actions";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { ShieldCheck, UserCheck, ShoppingBag, Printer, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LoginForm() {
  const [email, setEmail] = useState("admin@fotograficos.com.br");
  const [password, setPassword] = useState("admin123");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: SaaS Branding & Quick Profile Switcher */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              SaaS Gráfica & Comunicação Visual
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Foto & Gráficos <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">ERP Pro</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Sistema de precificação por m², controle de estoque de insumos, fluxo de PCP em tempo real e controle de permissões por nível de acesso (RBAC).
            </p>
          </div>

          {/* Quick Access Roles Cards */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Selecione um perfil para entrar direto:</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {quickProfiles.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(item.role)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-700/60 hover:border-indigo-500/50 transition-all duration-200 group flex flex-col justify-between h-full backdrop-blur-md shadow-sm hover:shadow-indigo-500/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-indigo-400 group-hover:text-cyan-300 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-slate-100 group-hover:text-white">
                          {item.title}
                        </span>
                      </div>
                      <Badge variant={item.variant} className="text-[10px] uppercase font-bold tracking-wider">
                        {item.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">
                      {item.subtitle}
                    </p>
                    <div className="flex items-center text-xs font-medium text-indigo-400 group-hover:text-indigo-300 mt-auto pt-1">
                      <span>{loading ? "Entrando..." : "Acessar agora"}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Traditional Login Form */}
        <div className="lg:col-span-5">
          <Card className="border-slate-700/80 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-slate-100">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                Entrar com E-mail
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Acesse sua conta com suas credenciais de usuário
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@fotograficos.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Senha
                    </Label>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-indigo-500/20 transition-all text-sm mt-2"
                >
                  {loading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-500">
                  Foto & Gráficos © 2026 — Controle Total de Produção & Vendas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
