import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SaasHeader } from "@/components/saas-header";
import { getSession, ensureDefaultUsers } from "@/lib/auth";
import { COMPANY, ensureInitialData } from "@/lib/company";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = COMPANY;

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
  await connection(); // pagina dinamica: o banco so existe em runtime, nunca no build
  await ensureDefaultUsers();
  await ensureInitialData();
  
  const company = COMPANY;
  const session = await getSession();

  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <TooltipProvider>
          {session ? (
            <SidebarProvider>
              <AppSidebar userRole={session.role} company={company} />
              <main className="w-full flex flex-col min-h-screen">
                <SaasHeader user={session} company={company} />
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
