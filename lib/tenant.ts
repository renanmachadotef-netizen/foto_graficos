import { headers, cookies } from "next/headers";
import { prisma } from "./prisma";

export type TenantId = "FOTOGRAFICOS" | "PURABRASIL";

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
  iconType: "print" | "alambique";
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
  PURABRASIL: {
    id: "PURABRASIL",
    name: "Cachaçaria Pura Brasil",
    shortName: "Pura Brasil",
    tagline: "Sistema de Gestão & Custos para Alambique & Cachaça Artesanal",
    domain: "purabrasil.renanmachado.com.br",
    theme: {
      primary: "amber",
      primaryLight: "amber-50",
      accent: "amber",
      bgGradient: "from-amber-700 via-amber-800 to-yellow-900",
      badge: "bg-amber-600 text-white",
    },
    iconType: "alambique",
    units: ["garrafa", "litro", "dose", "cx", "fardo", "barril", "un"],
    categories: [
      { id: "BEBIDAS", label: "Cachaças 750ml / 500ml" },
      { id: "DOSES", label: "Shots & Doses 60ml" },
      { id: "KITS", label: "Kits & Presentes" },
      { id: "CAIXAS", label: "Caixas & Fardos Atacado" },
      { id: "BARRIS", label: "Barris & Envelhecimento" },
      { id: "ACESSORIOS", label: "Copos & Acessórios" },
    ],
    pontoEquilibrioLabel: "Ponto de Equilíbrio do Alambique",
  },
};

/**
 * Automatically detects the active tenant based on HTTP host / domain
 * or cookie override (for admin switching).
 */
export async function getCurrentTenant(): Promise<TenantId> {
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get("active_tenant")?.value as TenantId;

  if (cookieTenant && (cookieTenant === "FOTOGRAFICOS" || cookieTenant === "PURABRASIL")) {
    return cookieTenant;
  }

  const headersList = await headers();
  const host = headersList.get("host") || headersList.get("x-forwarded-host") || "";

  if (host.toLowerCase().includes("purabrasil")) {
    return "PURABRASIL";
  }

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
    if (tenantId === "PURABRASIL") {
      await prisma.companySettings.create({
        data: {
          tenantId: "PURABRASIL",
          companyName: "Cachaçaria Pura Brasil",
          document: "00.000.000/0001-99",
          phone: "(11) 99999-0002",
          email: "contato@purabrasil.com.br",
          address: "Fazenda Alambique Velho - Estrada do Açúcar, Km 12",
          pixKey: "contato@purabrasil.com.br",
          rent: 1500,
          energy: 600,
          internet: 150,
          otherFixed: 750,
          workingCap: 5000,
        },
      });
    } else {
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
  }

  // 2. Ensure Stock Materials
  const materialsCount = await prisma.material.count({
    where: { tenantId },
  });

  if (materialsCount === 0) {
    if (tenantId === "PURABRASIL") {
      await prisma.material.createMany({
        data: [
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Prata Clássica (Granel)",
            category: "CACHACA_GRANEL",
            unit: "litro",
            unitCost: 8.5,
            currentStock: 1200,
            minStock: 200,
          },
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Carvalho Francês (Granel)",
            category: "CACHACA_GRANEL",
            unit: "litro",
            unitCost: 18.0,
            currentStock: 650,
            minStock: 100,
          },
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Amburana Nobre (Granel)",
            category: "CACHACA_GRANEL",
            unit: "litro",
            unitCost: 16.0,
            currentStock: 450,
            minStock: 100,
          },
          {
            tenantId: "PURABRASIL",
            name: "Garrafa Vidro 750ml Modelo Paris",
            category: "GARRAFAS_VIDRO",
            unit: "un",
            unitCost: 4.8,
            currentStock: 400,
            minStock: 100,
          },
          {
            tenantId: "PURABRASIL",
            name: "Tampa de Madeira c/ Rolha de Cortiça",
            category: "TAMPAS_ROLHAS",
            unit: "un",
            unitCost: 1.7,
            currentStock: 500,
            minStock: 150,
          },
          {
            tenantId: "PURABRASIL",
            name: "Lacre Termoencolhível Transparente",
            category: "ROTULOS_LACRES",
            unit: "un",
            unitCost: 0.35,
            currentStock: 800,
            minStock: 200,
          },
          {
            tenantId: "PURABRASIL",
            name: "Rótulo Frontal + Verso Metalizado Pura Brasil",
            category: "ROTULOS_LACRES",
            unit: "un",
            unitCost: 1.2,
            currentStock: 600,
            minStock: 150,
          },
          {
            tenantId: "PURABRASIL",
            name: "Caixa de Papelão Reforçada (6 Garrafas)",
            category: "EMBALAGENS_CAIXAS",
            unit: "cx",
            unitCost: 3.5,
            currentStock: 80,
            minStock: 20,
          },
        ],
      });
    } else {
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
  }

  // 3. Ensure Products for POS
  const productsCount = await prisma.product.count({
    where: { tenantId },
  });

  if (productsCount === 0) {
    if (tenantId === "PURABRASIL") {
      await prisma.product.createMany({
        data: [
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Pura Brasil Carvalho 750ml",
            category: "BEBIDAS",
            price: 89.0,
            cost: 28.0,
            unit: "garrafa",
            description: "Envelhecida 2 anos em barril de carvalho francês",
          },
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Pura Brasil Amburana 750ml",
            category: "BEBIDAS",
            price: 79.0,
            cost: 25.0,
            unit: "garrafa",
            description: "Aroma suave com notas de canela e baunilha",
          },
          {
            tenantId: "PURABRASIL",
            name: "Cachaça Pura Brasil Prata 750ml",
            category: "BEBIDAS",
            price: 55.0,
            cost: 16.0,
            unit: "garrafa",
            description: "Descansada em inox, límpida e sabor puro da cana",
          },
          {
            tenantId: "PURABRASIL",
            name: "Caixa c/ 6un Cachaça Carvalho 750ml (Atacado)",
            category: "CAIXAS",
            price: 480.0,
            cost: 168.0,
            unit: "cx",
            description: "Caixa fechada para empórios, bares e restaurantes",
          },
          {
            tenantId: "PURABRASIL",
            name: "Kit Degustação 3 Madeiras (3x 60ml)",
            category: "KITS",
            price: 65.0,
            cost: 20.0,
            unit: "un",
            description: "Carvalho Francês, Amburana e Jequitibá Rosa",
          },
          {
            tenantId: "PURABRASIL",
            name: "Dose / Shot Degustação (50ml)",
            category: "DOSES",
            price: 10.0,
            cost: 1.5,
            unit: "dose",
            description: "Dose avulsa no balcão da cachaçaria",
          },
          {
            tenantId: "PURABRASIL",
            name: "Copinho de Cachaça Personalizado Pura Brasil",
            category: "ACESSORIOS",
            price: 15.0,
            cost: 4.5,
            unit: "un",
            description: "Vidro temperado com gravação a laser",
          },
        ],
      });
    } else {
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
  }

  // 4. Ensure Fixed Costs
  const fixedCostsCount = await prisma.fixedCost.count({
    where: { tenantId },
  });

  if (fixedCostsCount === 0) {
    if (tenantId === "PURABRASIL") {
      await prisma.fixedCost.createMany({
        data: [
          { tenantId: "PURABRASIL", name: "Lenha / Caldeira do Alambique", amount: 900 },
          { tenantId: "PURABRASIL", name: "Água & Limpeza Industrial", amount: 450 },
          { tenantId: "PURABRASIL", name: "Energia Elétrica", amount: 650 },
          { tenantId: "PURABRASIL", name: "Certificações & MAPA", amount: 400 },
          { tenantId: "PURABRASIL", name: "Manutenção de Dornas & Bombas", amount: 350 },
        ],
      });
    } else {
      await prisma.fixedCost.createMany({
        data: [
          { tenantId: "FOTOGRAFICOS", name: "Aluguel do Ponto Comercial", amount: 2000 },
          { tenantId: "FOTOGRAFICOS", name: "Energia Elétrica Comercial", amount: 800 },
          { tenantId: "FOTOGRAFICOS", name: "Internet Fibra", amount: 200 },
          { tenantId: "FOTOGRAFICOS", name: "Manutenção de Plotters & Cabeças", amount: 600 },
        ],
      });
    }
  }
}
