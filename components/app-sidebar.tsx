"use client";

import {
  Home,
  Calculator,
  Package,
  Cpu,
  Users,
  FileText,
  Settings,
  CircleDollarSign,
  PackageSearch,
  UserCog,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  allowedRoles: Role[];
  badge?: string;
}

interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    groupLabel: "Comercial & Vendas",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
        allowedRoles: ["ADMIN", "MANAGER", "SELLER", "PRODUCTION"],
      },
      {
        title: "Clientes (CRM)",
        url: "/clients",
        icon: Users,
        allowedRoles: ["ADMIN", "MANAGER", "SELLER"],
      },
      {
        title: "Orçamentos & Vendas",
        url: "/quotes",
        icon: FileText,
        allowedRoles: ["ADMIN", "MANAGER", "SELLER"],
      },
      {
        title: "Calculadora de Preço",
        url: "/pricing",
        icon: Calculator,
        allowedRoles: ["ADMIN", "MANAGER", "SELLER"],
      },
    ],
  },
  {
    groupLabel: "Produção & Estoque",
    items: [
      {
        title: "Fila de Produção (PCP)",
        url: "/pcp",
        icon: PackageSearch,
        allowedRoles: ["ADMIN", "MANAGER", "PRODUCTION"],
      },
      {
        title: "Estoque & Insumos",
        url: "/materials",
        icon: Package,
        allowedRoles: ["ADMIN", "MANAGER", "PRODUCTION"],
      },
    ],
  },
  {
    groupLabel: "Financeiro & Custos",
    items: [
      {
        title: "Fluxo Financeiro",
        url: "/financial",
        icon: CircleDollarSign,
        allowedRoles: ["ADMIN", "MANAGER", "SELLER"],
      },
      {
        title: "Custo de Máquinas",
        url: "/machines",
        icon: Cpu,
        allowedRoles: ["ADMIN"],
      },
      {
        title: "Equipe & Mão de Obra",
        url: "/employees",
        icon: Users,
        allowedRoles: ["ADMIN"],
      },
    ],
  },
  {
    groupLabel: "Administração",
    items: [
      {
        title: "Usuários & Acessos",
        url: "/users",
        icon: UserCog,
        allowedRoles: ["ADMIN"],
        badge: "ADMIN",
      },
      {
        title: "Configurações Gerais",
        url: "/settings",
        icon: Settings,
        allowedRoles: ["ADMIN", "MANAGER"],
      },
    ],
  },
];

interface AppSidebarProps {
  userRole?: Role;
}

export function AppSidebar({ userRole = "ADMIN" }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-slate-200/80 bg-white">
      <SidebarContent className="p-2 space-y-4">
        {/* Brand Header */}
        <div className="px-3 py-4 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">Foto & Gráficos</h2>
            <p className="text-[11px] text-slate-500 font-medium">Sistema ERP Gráfico</p>
          </div>
        </div>

        {/* Dynamic Groups filtered by Role */}
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.allowedRoles.includes(userRole));
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.groupLabel} className="p-0">
              <SidebarGroupLabel className="text-[11px] font-bold text-slate-600 px-3 uppercase tracking-wider mb-1">
                {group.groupLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.url}>
                        <a
                          href={item.url}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                            <span>{item.title}</span>
                          </div>
                          {item.badge && !isActive && (
                            <Badge variant="admin" className="text-[9px] px-1.5 py-0 uppercase">
                              {item.badge}
                            </Badge>
                          )}
                        </a>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
