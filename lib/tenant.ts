import { prisma } from "./prisma";

export type TenantId = "FOTOGRAFICOS";

export interface TenantConfig {
  id: TenantId;
  name: string;
  shortName: string;
  tagline: string;
  domain: string;
  theme: {
    primary: string;
    primaryLight: string;
    accent: string;
    bgGradient: string;
    badge: string;
  };
  iconType: "print";
  units: string[];
  categories: { id: string; label: string }[];
  pontoEquilibrioLabel: string;
}

export const TENANT_CONFIGS: Record<TenantId, TenantConfig> = {
  FOTOGRAFICOS: {
    id: "FOTOGRAFICOS",
    name: "Foto & Gráficos",
    shortName: "Foto & Gráficos",
    tagline: "Sistema de Gestão & Precificação para Comunicação Visual",
    domain: "fotograficos.renanmachado.com.br",
    theme: {
      primary: "indigo",
      primaryLight: "indigo-50",
      accent: "emerald",
      bgGradient: "from-indigo-600 to-indigo-800",
      badge: "bg-indigo-600 text-white",
    },
    iconType: "print",
    units: ["m²", "un", "cento", "milheiro", "ml", "litro"],
    categories: [
      { id: "BALCAO", label: "Gráfica Rápida" },
      { id: "IMPRESSAO", label: "Banners & Lonas" },
      { id: "FOTOS", label: "Fotos & Estúdio" },
      { id: "ACABAMENTO", label: "Acabamentos" },
      { id: "BRINDES", label: "Brindes & Crachás" },
    ],
    pontoEquilibrioLabel: "Ponto de Equilíbrio da Gráfica",
  },
};

/** Sistema de uma unica empresa: Foto & Graficos.
 */
export async function getCurrentTenant(): Promise<TenantId> {
  return "FOTOGRAFICOS";
}

/**
 * Automatically seeds demo data, materials and settings for a tenant if empty.
 */
export async function ensureTenantInitialData(tenantId: TenantId) {
  // 1. Ensure Company Settings
  const settingsCount = await prisma.companySettings.count({
    where: { tenantId },
  });

  if (settingsCount === 0) {
          await prisma.companySettings.create({
        data: {
          tenantId: "FOTOGRAFICOS",
          companyName: "Foto & Gráficos",
          document: "00.000.000/0001-00",
          phone: "(11) 99999-0001",
          email: "contato@fotograficos.com.br",
          address: "Av. Principal, 1000 - Centro",
          pixKey: "financeiro@fotograficos.com.br",
          rent: 2000,
          energy: 800,
          internet: 200,
          otherFixed: 1000,
          workingCap: 8000,
        },
      });
  }

  // 2. Ensure Stock Materials
  const materialsCount = await prisma.material.count({
    where: { tenantId },
  });

  if (materialsCount === 0) {
          await prisma.material.createMany({
        data: [
          {
            tenantId: "FOTOGRAFICOS",
            name: "Lona Frontlight 440g",
            category: "VINIL_LONA",
            unit: "m2",
            unitCost: 14.5,
            currentStock: 150,
            minStock: 30,
            width: 1.6,
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Adesivo Vinil Branco Brilho",
            category: "VINIL_LONA",
            unit: "m2",
            unitCost: 12.0,
            currentStock: 200,
            minStock: 40,
            width: 1.22,
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Chapa PS 2mm Branco",
            category: "RIGIDOS_CHAPAS",
            unit: "m2",
            unitCost: 45.0,
            currentStock: 25,
            minStock: 5,
          },
        ],
      });
  }

  // 3. Ensure Products for POS
  const productsCount = await prisma.product.count({
    where: { tenantId },
  });

  if (productsCount === 0) {
          await prisma.product.createMany({
        data: [
          {
            tenantId: "FOTOGRAFICOS",
            name: "Cartão de Visita 1000un (4x0)",
            category: "BALCAO",
            price: 75.0,
            cost: 35.0,
            unit: "milheiro",
            description: "Couchê 250g c/ Verniz Total Frente",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Banner Lona 440g c/ Bastão e Corda",
            category: "IMPRESSAO",
            price: 65.0,
            cost: 22.0,
            unit: "m2",
            description: "Impressão digital com acabamento",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Adesivo Vinil Brilho Recortado",
            category: "IMPRESSAO",
            price: 55.0,
            cost: 18.0,
            unit: "m2",
            description: "Vinil adesivo recortado",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Foto 3x4 (Cartela c/ 8 fotos)",
            category: "FOTOS",
            price: 20.0,
            cost: 3.0,
            unit: "un",
            description: "Papel fotográfico glossy",
          },
        ],
      });
  }

  // 4. Ensure Fixed Costs
  const fixedCostsCount = await prisma.fixedCost.count({
    where: { tenantId },
  });

  if (fixedCostsCount === 0) {
          await prisma.fixedCost.createMany({
        data: [
          { tenantId: "FOTOGRAFICOS", name: "Aluguel do Ponto Comercial", amount: 2000 },
          { tenantId: "FOTOGRAFICOS", name: "Energia Elétrica Comercial", amount: 800 },
          { tenantId: "FOTOGRAFICOS", name: "Internet Fibra", amount: 200 },
          { tenantId: "FOTOGRAFICOS", name: "Manutenção de Plotters & Cabeças", amount: 600 },
        ],
      });
  }

  // 5. Ensure Clients
  const clientsCount = await prisma.client.count({
    where: { tenantId },
  });

  if (clientsCount === 0) {
          await prisma.client.createMany({
        data: [
          {
            tenantId: "FOTOGRAFICOS",
            name: "Studio Foto & Eventos Arte Digital",
            document: "18.234.567/0001-88",
            phone: "48991234567",
            email: "contato@studioartedigital.com.br",
            birthDay: 10,
            birthMonth: 5,
            status: "Ativo",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Agência Criativa Marketing & Comunicação",
            document: "27.890.123/0001-44",
            phone: "48984567890",
            email: "atendimento@agenciacriativa.com.br",
            birthDay: 20,
            birthMonth: 7,
            status: "Ativo",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Restaurante Bella Italia (Cardápios & Banners)",
            document: "33.456.789/0001-22",
            phone: "48998765432",
            email: "pedidos@bellaitalia.com.br",
            birthDay: 14,
            birthMonth: 8,
            status: "Ativo",
          },
          {
            tenantId: "FOTOGRAFICOS",
            name: "Imobiliária Sol Nascente (Placas & Fachadas)",
            document: "41.678.901/0001-11",
            phone: "48991122334",
            email: "comercial@solnascenteimoveis.com.br",
            birthDay: 28,
            birthMonth: 11,
            status: "Ativo",
          },
        ],
      });
  }

}
