"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { logoutAction, quickLoginRole } from "@/app/login/actions";
import { CompanyConfig } from "@/lib/company";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Printer,
  LogOut,
  ArrowLeftRight,
  User,
} from "lucide-react";
import { useState } from "react";

interface SaasHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string | null;
  } | null;
  company: CompanyConfig;
}

export function SaasHeader({ user, company }: SaasHeaderProps) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);


  if (!user) {
    return (
      <header className="h-14 border-b border-slate-200 bg-card px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-semibold text-slate-800 text-sm">{company.name}</span>
        </div>
        <a href="/login">
          <Button size="sm" variant="outline" className="text-xs">
            Fazer Login
          </Button>
        </a>
      </header>
    );
  }

  const roleIcons: Record<Role, any> = {
    ADMIN: ShieldCheck,
    MANAGER: UserCheck,
    SELLER: ShoppingBag,
    PRODUCTION: Printer,
  };

  const RoleIcon = roleIcons[user.role] || User;

  return (
    <header className="h-14 border-b border-slate-200/80 bg-card/95 backdrop-blur-md px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left side: Sidebar trigger & Company Title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`font-bold text-sm tracking-tight flex items-center gap-1.5 ${
              "text-slate-800"
            }`}
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            {company.name}
          </span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-xs font-medium text-slate-500">{company.tagline.split(" para ")[1] || "Gestão & Produção"}</span>
        </div>
      </div>

      {/* Right side: Tema + User Card + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        {/* User Card with Role Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1">
          <div
            className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs ${
              "bg-ink"
            }`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{user.email}</span>
          </div>
          <Badge
            variant={
              user.role === "ADMIN"
                ? "admin"
                : user.role === "MANAGER"
                ? "manager"
                : user.role === "SELLER"
                ? "seller"
                : "production"
            }
            className="text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <RoleIcon className="w-3 h-3" />
            <span>{user.role}</span>
          </Badge>
        </div>

        {/* Quick Role Switcher for Testing */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowRoleSwitcher(!showRoleSwitcher);
            }}
            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1 cursor-pointer"
            title="Trocar Perfil de Acesso"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Perfil</span>
          </Button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Simular Perfil:
              </div>
              {(["ADMIN", "MANAGER", "SELLER", "PRODUCTION"] as Role[]).map((role) => (
                <button
                  key={role}
                  onClick={async () => {
                    setShowRoleSwitcher(false);
                    await quickLoginRole(role);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-slate-100 transition-colors ${
                    user.role === role ? "bg-slate-50 text-indigo-600 font-bold" : "text-slate-700"
                  }`}
                >
                  <span>{ROLE_PERMISSIONS[role].label}</span>
                  {user.role === role && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <form action={logoutAction}>
          <Button
            size="sm"
            variant="ghost"
            type="submit"
            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
