import { ClientForm } from "./ClientForm";
import { LimiteFiado } from "./LimiteFiado";
import { Etiquetas } from "./Etiquetas";
import { getSession } from "@/lib/auth";
import { Cake, Phone } from "lucide-react";
import { ExcluirCliente } from "./ExcluirCliente";
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            <strong className="text-foreground">{totalGeral}</strong> clientes cadastrados.
          </p>
        </div>
        <ClientForm />
      </div>

      <form action="/clients" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={termo}
          aria-label="Buscar cliente"
          placeholder="Buscar por nome, telefone ou CPF/CNPJ"
          className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-base"
        />
        <Button type="submit" className="h-12 px-6 cursor-pointer">Buscar</Button>
        {termo && (
          <Link href="/clients" className="inline-flex h-12 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
            Limpar
          </Link>
        )}
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando <strong className="text-foreground">{clients.length}</strong> de <strong className="text-foreground">{totalFiltrado}</strong>
        </span>
        <Link href="/birthdays" className="inline-flex items-center gap-1.5 font-semibold text-foreground underline underline-offset-2">
          <Cake className="size-4" /> Aniversariantes e sorteio ({birthdayCount})
        </Link>
      </div>

      {clients.length === 0 && (
        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/40 space-y-1">
          <p className="text-muted-foreground">{termo ? "Nenhum cliente encontrado com essa busca." : "Nenhum cliente cadastrado ainda."}</p>
          {!termo && <p className="text-sm text-muted-foreground">Use o botão “Novo cliente” para cadastrar o primeiro.</p>}
        </div>
      )}

      <div className="grid gap-3">
        {clients.map((client) => (
          <div key={client.id} className="p-4 bg-card border border-border rounded-xl flex justify-between items-start gap-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-lg">{client.name}</h3>
                {client.birthDay && client.birthMonth && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Cake className="size-3" /> {String(client.birthDay).padStart(2, "0")}/{String(client.birthMonth).padStart(2, "0")}
                  </span>
                )}
                {client.code && <span className="text-xs text-muted-foreground">nº {client.code}</span>}
              </div>

              {client.phone ? (
                <p className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums text-foreground">
                  <Phone className="size-4 text-muted-foreground" /> {client.phone}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Sem telefone</p>
              )}

              {(client.document || client.email || client.address) && (
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  {[client.document, client.email, client.address].filter(Boolean).join(" · ")}
                </p>
              )}
              <Etiquetas clientId={client.id} inicial={client.tags} />
              {session?.role === "ADMIN" && <div className="mt-1"><LimiteFiado clientId={client.id} limite={client.creditLimit} /></div>}
            </div>

            <ExcluirCliente id={client.id} nome={client.name} />
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
  );
}
