export type Role = "ADMIN" | "MANAGER" | "SELLER" | "PRODUCTION";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
}

export const ROLE_PERMISSIONS: Record<Role, {
  label: string;
  description: string;
  badgeColor: string;
  allowedRoutes: string[];
  canManageSettings: boolean;
  canManageCosts: boolean;
  canManageUsers: boolean;
  canManageFinancial: boolean;
  canManageStock: boolean;
  canManagePcp: boolean;
  canManageQuotes: boolean;
  canManageClients: boolean;
}> = {
  ADMIN: {
    label: "Administrador (Full)",
    description: "Acesso total a todas as áreas, custos, equipe, máquinas, configurações e usuários",
    badgeColor: "bg-purple-600 text-white",
    allowedRoutes: ["/", "/pdv", "/quotes", "/clients", "/pcp", "/pricing", "/materials", "/machines", "/employees", "/financial", "/settings", "/users"],
    canManageSettings: true,
    canManageCosts: true,
    canManageUsers: true,
    canManageFinancial: true,
    canManageStock: true,
    canManagePcp: true,
    canManageQuotes: true,
    canManageClients: true,
  },
  MANAGER: {
    label: "Gerente",
    description: "Pode alterar dados operacionais, vendas, estoque, PCP e financeiro",
    badgeColor: "bg-blue-600 text-white",
    allowedRoutes: ["/", "/pdv", "/quotes", "/clients", "/pcp", "/pricing", "/materials", "/financial"],
    canManageSettings: false,
    canManageCosts: false,
    canManageUsers: false,
    canManageFinancial: true,
    canManageStock: true,
    canManagePcp: true,
    canManageQuotes: true,
    canManageClients: true,
  },
  SELLER: {
    label: "Vendedor",
    description: "Lança vendas/orçamentos, gerencia clientes e dá baixa em recebimentos",
    badgeColor: "bg-emerald-600 text-white",
    allowedRoutes: ["/", "/pdv", "/quotes", "/clients", "/pricing", "/financial"],
    canManageSettings: false,
    canManageCosts: false,
    canManageUsers: false,
    canManageFinancial: false,
    canManageStock: false,
    canManagePcp: false,
    canManageQuotes: true,
    canManageClients: true,
  },
  PRODUCTION: {
    label: "Operador de Produção",
    description: "Visualiza fila do PCP e baixa de status das ordens de serviço",
    badgeColor: "bg-amber-600 text-white",
    allowedRoutes: ["/", "/pcp", "/materials"],
    canManageSettings: false,
    canManageCosts: false,
    canManageUsers: false,
    canManageFinancial: false,
    canManageStock: false,
    canManagePcp: true,
    canManageQuotes: false,
    canManageClients: false,
  },
};
