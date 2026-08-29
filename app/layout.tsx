import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SaasHeader } from "@/components/saas-header";
import { getSession, ensureDefaultUsers } from "@/lib/auth";
import { getCurrentTenant, TENANT_CONFIGS, ensureTenantInitialData } from "@/lib/tenant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenantId = await getCurrentTenant();
  const config = TENANT_CONFIGS[tenantId];

  return {
    title: `${config.name} ERP Pro`,
    description: config.tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenantId = await getCurrentTenant();
  await ensureDefaultUsers();
  await ensureTenantInitialData(tenantId);
  
  const tenantConfig = TENANT_CONFIGS[tenantId];
  const session = await getSession();

  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
        <TooltipProvider>
          {session ? (
            <SidebarProvider>
              <AppSidebar userRole={session.role} tenantConfig={tenantConfig} />
              <main className="w-full flex flex-col min-h-screen">
                <SaasHeader user={session} tenantConfig={tenantConfig} />
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
