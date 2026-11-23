import { ClientForm } from "./ClientForm";
import { LimiteFiado } from "./LimiteFiado";
import { Etiquetas } from "./Etiquetas";
import { getSession } from "@/lib/auth";
import { Trash2, Cake, Gift, ArrowRight, Download, RefreshCw } from "lucide-react";
import { deleteClient } from "./actions";
import { prisma } from "@/lib/prisma";
import { ensureInitialData } from "@/lib/company";
import Link from "next/link";
import { normalizarBusca } from "@/lib/busca";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const POR_PAGINA = 30;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; n?: string }> }) {
  await ensureInitialData();
  const session = await getSession();
  const { q = "", n } = await searchParams;
  const termo = q.trim();
  const limite = Math.min(Math.max(parseInt(n ?? "", 10) || POR_PAGINA, POR_PAGINA), 3000);
  const palavras = normalizarBusca(termo).split(" ").filter(Boolean);
  const where = palavras.length ? { AND: palavras.map((w) => ({ searchKey: { contains: w } })) } : {};

  const [clients, totalFiltrado, totalGeral, birthdayCount] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limite,
    }),
    prisma.client.count({ where }),
    prisma.client.count(),
    prisma.client.count({
      where: {
        birthMonth: { not: null },
      },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Birthday Promotion Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Clientes (CRM)</h1>
          <p className="text-muted-foreground">
            Gerencie sua carteira com <strong>{totalGeral} clientes</strong> cadastrados.
          </p>
        </div>

        <Link href="/birthdays">
          <Button className="bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-pink-500/20 gap-2 cursor-pointer rounded-xl">
            <Cake className="w-4 h-4 text-yellow-300" />
            Aniversariantes & Sorteio ({birthdayCount})
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ClientForm />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-700">Carteira de Clientes</h2>
            <span className="text-xs text-slate-500 font-medium">
              Mostrando <strong>{clients.length}</strong> de <strong>{totalFiltrado}</strong>
            </span>
          </div>

          <form action="/clients" method="get" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={termo}
              aria-label="Buscar cliente"
              placeholder="Buscar por nome, telefone ou CPF/CNPJ"
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-base"
            />
            <Button type="submit" className="h-11 cursor-pointer">Buscar</Button>
            {termo && (
              <Link href="/clients" className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
                Limpar
              </Link>
            )}
          </form>
          
          {clients.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">{termo ? "Nenhum cliente encontrado com essa busca." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          )}
          
          <div className="grid gap-3">
            {clients.map(client => (
              <div key={client.id} className="p-4 bg-card border border-slate-200 rounded-xl flex justify-between items-center shadow-xs hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base">{client.name}</h3>
                    {client.code && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        Cód #{client.code}
                      </span>
                    )}
                    {client.birthDay && client.birthMonth && (
                      <span className="text-[11px] text-pink-700 bg-pink-50 border border-pink-200/80 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        🎂 {client.birthDay}/{client.birthMonth < 10 ? `0${client.birthMonth}` : client.birthMonth}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {client.phone && <p>Tel: <strong className="text-slate-700">{client.phone}</strong></p>}
                    {client.document && <p>Doc: <strong className="text-slate-700">{client.document}</strong></p>}
                    {client.email && <p>Email: <strong className="text-slate-700">{client.email}</strong></p>}
                  </div>
                  <Etiquetas clientId={client.id} inicial={client.tags} />
                  {client.address && <p className="text-[11px] text-slate-400 mt-1 truncate max-w-md">{client.address}</p>}
                  {session?.role === "ADMIN" && <div className="mt-1"><LimiteFiado clientId={client.id} limite={client.creditLimit} /></div>}
                </div>
                
                <div className="text-right border-l pl-4 ml-4">
                  <form action={async () => { "use server"; await deleteClient(client.id); }}>
                    <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 cursor-pointer">
                      <Trash2 size={18}/>
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          {clients.length < totalFiltrado && (
            <div className="text-center">
              <Link
                href={`/clients?${new URLSearchParams({ ...(termo ? { q: termo } : {}), n: String(limite + POR_PAGINA) }).toString()}`}
                className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-6 font-semibold hover:bg-muted"
              >
                Ver mais 30 clientes
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
