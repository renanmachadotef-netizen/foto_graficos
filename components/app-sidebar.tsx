"use client";

import { Home, Calculator, Package, Cpu, Users, FileText, Settings, CircleDollarSign, PenTool, PackageSearch } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Clientes (CRM)",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Orçamentos",
    url: "/quotes",
    icon: FileText,
  },
  {
    title: "Produção (PCP)",
    url: "/pcp",
    icon: PackageSearch,
  },
  {
    title: "Calculadora de Preços",
    url: "/pricing",
    icon: Calculator,
  },
  {
    title: "Insumos & Materiais",
    url: "/materials",
    icon: Package,
  },
  {
    title: "Máquinas",
    url: "/machines",
    icon: Cpu,
  },
  {
    title: "Funcionários",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Financeiro",
    url: "/financial",
    icon: CircleDollarSign,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-slate-800 py-6 mb-2">Foto & Gráficos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <a href={item.url} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 transition-colors w-full text-sm font-medium">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
