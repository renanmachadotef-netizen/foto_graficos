"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { logoutAction, quickLoginRole, switchTenantAction } from "@/app/login/actions";
import { TenantConfig, TenantId } from "@/lib/tenant";
import {
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Printer,
  LogOut,
  ArrowLeftRight,
  User,
  Wine,
  Building2,
  Check,
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
  tenantConfig: TenantConfig;
}

export function SaasHeader({ user, tenantConfig }: SaasHeaderProps) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);

  const isPuraBrasil = tenantConfig.id === "PURABRASIL";

  if (!user) {
    return (
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-semibold text-slate-800 text-sm">{tenantConfig.name}</span>
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
    MANAGER: isPuraBrasil ? Wine : UserCheck,
    SELLER: ShoppingBag,
    PRODUCTION: Printer,
  };

  const RoleIcon = roleIcons[user.role] || User;

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left side: Sidebar trigger & Company Title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`font-bold text-sm tracking-tight flex items-center gap-1.5 ${
              isPuraBrasil ? "text-amber-900" : "text-slate-800"
            }`}
          >
            {isPuraBrasil ? <Wine className="w-4 h-4 text-amber-600" /> : <Printer className="w-4 h-4 text-indigo-600" />}
            {tenantConfig.name}
          </span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-xs font-medium text-slate-500">{tenantConfig.tagline.split(" para ")[1] || "Gestão & Produção"}</span>
        </div>
      </div>

      {/* Right side: Tenant Switcher (for Admins) + User Card + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Company / Tenant Switcher */}
        {user.role === "ADMIN" && (
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowTenantSwitcher(!showTenantSwitcher);
                setShowRoleSwitcher(false);
              }}
              className={`h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                isPuraBrasil
                  ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                  : "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{tenantConfig.shortName}</span>
            </Button>

            {showTenantSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Alternar Empresa:
                </div>
                <button
                  onClick={async () => {
                    setShowTenantSwitcher(false);
                    await switchTenantAction("FOTOGRAFICOS");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                    !isPuraBrasil ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="leading-tight">Foto & Gráficos</p>
                      <p className="text-[10px] text-slate-400 font-normal">Gráfica & Comunicação Visual</p>
                    </div>
                  </div>
                  {!isPuraBrasil && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  onClick={async () => {
                    setShowTenantSwitcher(false);
                    await switchTenantAction("PURABRASIL");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-slate-100 transition-colors mt-1 cursor-pointer ${
                    isPuraBrasil ? "bg-amber-50 text-amber-800 font-bold" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wine className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="leading-tight">Cachaçaria Pura Brasil</p>
                      <p className="text-[10px] text-slate-400 font-normal">Alambique & Cachaça Artesanal</p>
                    </div>
                  </div>
                  {isPuraBrasil && <Check className="w-4 h-4 text-amber-600" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Card with Role Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1">
          <div
            className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs ${
              isPuraBrasil ? "bg-amber-700" : "bg-slate-900"
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
              setShowTenantSwitcher(false);
            }}
            className="h-8 px-2 text-xs text-slate-700 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1 cursor-pointer"
            title="Trocar Perfil de Acesso"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Perfil</span>
          </Button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95">
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
