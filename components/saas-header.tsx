"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { logoutAction, quickLoginRole } from "@/app/login/actions";
import { ShieldCheck, UserCheck, ShoppingBag, Printer, LogOut, ArrowLeftRight, User } from "lucide-react";
import { useState } from "react";

interface SaasHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string | null;
  } | null;
}

export function SaasHeader({ user }: SaasHeaderProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!user) {
    return (
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-semibold text-slate-800 text-sm">Foto & Gráficos ERP</span>
        </div>
        <a href="/login">
          <Button size="sm" variant="outline" className="text-xs">
            Fazer Login
          </Button>
        </a>
      </header>
    );
  }

  const roleInfo = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.SELLER;

  const roleIcons: Record<Role, any> = {
    ADMIN: ShieldCheck,
    MANAGER: UserCheck,
    SELLER: ShoppingBag,
    PRODUCTION: Printer,
  };

  const RoleIcon = roleIcons[user.role] || User;

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left side: Sidebar trigger & Title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm tracking-tight">Foto & Gráficos</span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-xs font-medium text-slate-500">Gestão & Produção</span>
        </div>
      </div>

      {/* Right side: Current User & Quick Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Card with Role Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
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

        {/* Quick Switch Dropdown Button for Demo/Testing */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="h-8 px-2.5 text-xs text-slate-700 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1.5"
            title="Alternar Perfil Rapidamente"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar Perfil</span>
          </Button>

          {showSwitcher && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Simular Acesso Como:
              </div>
              {(["ADMIN", "MANAGER", "SELLER", "PRODUCTION"] as Role[]).map((role) => (
                <button
                  key={role}
                  onClick={async () => {
                    setShowSwitcher(false);
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
            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
