import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foto & Gráficos",
  description: "Sistema interno de controle e precificação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full flex flex-col min-h-screen">
              <div className="flex h-12 items-center border-b px-4 bg-white shadow-sm">
                <SidebarTrigger />
                <span className="ml-4 font-medium text-slate-600">Sistema Gerencial</span>
              </div>
              <div className="flex-1 p-6">
                {children}
              </div>
            </main>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
