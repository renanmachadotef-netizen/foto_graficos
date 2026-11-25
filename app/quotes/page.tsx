import { exigirPapel } from "@/lib/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ExcluirOrcamento } from "./ExcluirOrcamento";
import { AcoesOrcamento } from "./AcoesOrcamento";
import { prisma } from "@/lib/prisma";
import { ensureInitialData } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { brl } from "@/app/pdv/venda-tipos";

export const dynamic = "force-dynamic";

const POR_PAGINA = 30;

const ABAS = {
  aguardando: { rotulo: "Aguardando", status: ["DRAFT", "SENT"] },
  aprovados: { rotulo: "Aprovados", status: ["APPROVED", "OPEN"] },
  recusados: { rotulo: "Recusados e cancelados", status: ["REJECTED", "CANCELLED"] },
  todos: { rotulo: "Todos", status: null },
} as const;
type Aba = keyof typeof ABAS;

const ETIQUETA: Record<string, { texto: string; cor: string; faixa: string }> = {
  APPROVED: { texto: "APROVADO", cor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200", faixa: "bg-emerald-600" },
  OPEN: { texto: "EM ABERTO", cor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200", faixa: "bg-emerald-600" },
  REJECTED: { texto: "RECUSADO", cor: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200", faixa: "bg-red-600" },
  CANCELLED: { texto: "CANCELADO", cor: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200", faixa: "bg-red-600" },
};
const ETIQUETA_PADRAO = { texto: "AGUARDANDO", cor: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200", faixa: "bg-sky-600" };

export default async function QuotesListPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; q?: string; n?: string; aviso?: string }>;
}) {
  await exigirPapel(["ADMIN", "MANAGER", "SELLER"]);
  const sessao = await getSession();
  const gerente = sessao?.role === "ADMIN" || sessao?.role === "MANAGER";
  const admin = sessao?.role === "ADMIN";
  await ensureInitialData();

  const { aba: abaParam, q = "", n, aviso } = await searchParams;
  const aba: Aba = abaParam && abaParam in ABAS ? (abaParam as Aba) : "aguardando";
  const termo = q.trim();
  const limite = Math.min(Math.max(parseInt(n ?? "", 10) || POR_PAGINA, POR_PAGINA), 3000);

  const filtroStatus = ABAS[aba].status ? { status: { in: [...ABAS[aba].status!] } } : {};
  const filtroBusca = termo
    ? { OR: [{ client: { name: { contains: termo, mode: "insensitive" as const } } }, { title: { contains: termo, mode: "insensitive" as const } }] }
    : {};
  const where = { ...filtroStatus, ...filtroBusca };

  const [quotes, totalFiltrado, porStatus] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
      take: limite,
    }),
    prisma.quote.count({ where }),
    prisma.quote.groupBy({ by: ["status"], where: filtroBusca, _count: { _all: true } }),
  ]);

  const contagem = (lista: readonly string[] | null) =>
    porStatus.filter((s) => !lista || lista.includes(s.status)).reduce((soma, s) => soma + s._count._all, 0);

  const link = (params: Record<string, string>) => `/quotes?${new URLSearchParams(params).toString()}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos e vendas</h1>
          <p className="text-muted-foreground">Aprove um orçamento para ele virar venda e abrir a ordem de serviço.</p>
        </div>
        <Link href="/pdv">
          <Button className="h-11 cursor-pointer">Fazer venda no balcão</Button>
        </Link>
      </div>

      {aviso && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <CheckCircle2 size={18} />
          {aviso === "aprovado"
            ? "Orçamento aprovado. A ordem de serviço foi criada e o valor entrou em contas a receber."
            : "Orçamento recusado. O valor a receber foi cancelado."}
        </div>
      )}

      <nav aria-label="Situação do orçamento" className="flex flex-wrap gap-2">
        {(Object.keys(ABAS) as Aba[]).map((k) => {
          const ativa = k === aba;
          return (
            <Link
              key={k}
              href={link({ aba: k, ...(termo ? { q: termo } : {}) })}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                ativa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {ABAS[k].rotulo}
              <span className={`tabular-nums ${ativa ? "opacity-90" : "text-muted-foreground"}`}>{contagem(ABAS[k].status)}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/quotes" method="get" className="flex gap-2">
        <input type="hidden" name="aba" value={aba} />
        <input
          type="search"
          name="q"
          defaultValue={termo}
          aria-label="Buscar orçamento"
          placeholder="Buscar por nome do cliente ou título"
          className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-base"
        />
        <Button type="submit" className="h-11 cursor-pointer">Buscar</Button>
        {termo && (
          <Link href={link({ aba })} className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
            Limpar
          </Link>
        )}
      </form>

      <div className="grid gap-4">
        {quotes.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/40 space-y-2">
            <p className="text-muted-foreground">
              {termo
                ? "Nenhum orçamento encontrado com essa busca."
                : aba === "aguardando"
                ? "Nenhum orçamento aguardando resposta. Os orçamentos novos aparecem aqui."
                : "Nada por aqui ainda."}
            </p>
            {!termo && (
              <Link href="/pdv" className="inline-block text-sm font-semibold text-primary underline underline-offset-2">
                Fazer uma venda no balcão
              </Link>
            )}
          </div>
        )}

        {quotes.map((quote) => {
          const et = ETIQUETA[quote.status] ?? ETIQUETA_PADRAO;
          const podeExcluir = (gerente && !quote.isPosSale && (quote.status === "DRAFT" || quote.status === "REJECTED")) || (admin && quote.status === "CANCELLED");
          return (
            <Card key={quote.id} className="overflow-hidden">
              <div className={`h-2 w-full ${et.faixa}`} />
              <CardContent className="p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">{quote.client.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${et.cor}`}>{et.texto}</span>
                    {quote.isPosSale && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Balcão</span>
                    )}
                  </div>
                  <h4 className="font-medium text-foreground/80">{quote.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Criado em {new Date(quote.createdAt).toLocaleDateString("pt-BR")}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {quote.items.map((item) => (
                      <span key={item.id} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {item.quantity}x {item.description}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1 md:items-end md:text-right">
                  <span className="text-xs font-semibold text-muted-foreground">Valor total</span>
                  <span className="text-2xl font-black tabular-nums text-foreground">{brl(quote.finalPrice)}</span>
                  {gerente && (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">Lucro estimado: {brl(quote.netProfit)}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="flex h-11 items-center gap-1.5 rounded-lg bg-muted px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
                  >
                    <Printer size={16} /> Ver proposta
                  </Link>
                  {quote.status === "DRAFT" && (
                    <AcoesOrcamento id={quote.id} cliente={quote.client.name} total={brl(quote.finalPrice)} />
                  )}
                  {podeExcluir && (
                    <span className="ml-auto md:ml-4 md:border-l md:pl-4">
                      <ExcluirOrcamento id={quote.id} titulo={quote.title} />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {quotes.length < totalFiltrado && (
        <div className="text-center">
          <Link
            href={link({ aba, ...(termo ? { q: termo } : {}), n: String(limite + POR_PAGINA) })}
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-6 font-semibold hover:bg-muted"
          >
            Ver mais {POR_PAGINA} orçamentos
          </Link>
        </div>
      )}
    </div>
  );
}
