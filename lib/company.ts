import { prisma } from "./prisma";

export interface CompanyConfig {
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

export const COMPANY: CompanyConfig = {
  name: "Foto & Gráficos",
  shortName: "Foto & Gráficos",
  tagline: "Sistema de Gestão & Precificação para Comunicação Visual",
  domain: "grafica.renanmachado.com.br",
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
};

/** Cria configuracoes iniciais (empresa, custos de exemplo) se as tabelas estiverem vazias. */
export async function ensureInitialData() {
  // 1. Ensure Company Settings
  const settingsCount = await prisma.companySettings.count();

  if (settingsCount === 0) {
          await prisma.companySettings.create({
        data: {
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
  const materialsCount = await prisma.material.count();

  if (materialsCount === 0) {
          await prisma.material.createMany({
        data: [
          {
            name: "Lona Frontlight 440g",
            category: "VINIL_LONA",
            unit: "m2",
            unitCost: 14.5,
            currentStock: 150,
            minStock: 30,
            width: 1.6,
          },
          {
            name: "Adesivo Vinil Branco Brilho",
            category: "VINIL_LONA",
            unit: "m2",
            unitCost: 12.0,
            currentStock: 200,
            minStock: 40,
            width: 1.22,
          },
          {
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

  // 4. Ensure Fixed Costs
  const fixedCostsCount = await prisma.fixedCost.count();

  if (fixedCostsCount === 0) {
          await prisma.fixedCost.createMany({
        data: [
          { name: "Aluguel do Ponto Comercial", amount: 2000 },
          { name: "Energia Elétrica Comercial", amount: 800 },
          { name: "Internet Fibra", amount: 200 },
          { name: "Manutenção de Plotters & Cabeças", amount: 600 },
        ],
      });
  }

  // Clientes e produtos nao tem exemplos: vem do NEX (Administracao > Trazer dados do NEX).
}
