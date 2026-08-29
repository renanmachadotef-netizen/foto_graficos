import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SaasHeader } from "@/components/saas-header";
import { getSession, ensureDefaultUsers } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foto & Gráficos ERP Pro",
  description: "Sistema SaaS de Gestão de Vendas, Estoque, Custos e PCP para Comunicação Visual",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureDefaultUsers();
  const session = await getSession();

  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
        <TooltipProvider>
          {session ? (
            <SidebarProvider>
              <AppSidebar userRole={session.role} />
              <main className="w-full flex flex-col min-h-screen">
                <SaasHeader user={session} />
                <div className="flex-1 p-4 sm:p-6 md:p-8">
                  {children}
                </div>
              </main>
            </SidebarProvider>
          ) : (
            <div className="min-h-screen">
              {children}
            </div>
          )}
        </TooltipProvider>
      </body>
    </html>
  );
}
