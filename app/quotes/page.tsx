import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveQuote, rejectQuote } from "./actions";
import { Check, X, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function QuotesListPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const quotes = await prisma.quote.findMany({
    where: { tenantId },
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Orçamentos & Propostas</h1>
        <p className="text-muted-foreground">Gerencie propostas enviadas e aprove-as para gerar Ordens de Serviço.</p>
      </div>

      <div className="grid gap-4">
        {quotes.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
            <p className="text-slate-500">Nenhum orçamento gerado nesta empresa ainda.</p>
          </div>
        )}
        
        {quotes.map(quote => (
          <Card key={quote.id} className="overflow-hidden">
            <div className={`h-2 w-full ${quote.status === 'APPROVED' ? 'bg-green-500' : quote.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-slate-800">{quote.client.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    quote.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    quote.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {quote.status === 'APPROVED' ? 'APROVADO' : quote.status === 'REJECTED' ? 'RECUSADO' : 'AGUARDANDO'}
                  </span>
                  {quote.isPosSale && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 uppercase">
                      PDV Balcão
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-slate-700">{quote.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p>
                
                <div className="mt-3 flex gap-2">
                  {quote.items.map(item => (
                    <span key={item.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {item.quantity}x {item.description}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400 font-semibold">VALOR TOTAL</span>
                <span className="text-2xl font-black text-slate-900">
                  R$ {quote.finalPrice.toFixed(2)}
                </span>
                <span className="text-xs text-green-600 font-bold">
                  Margem: R$ {quote.netProfit.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2">
                <Link href={`/quotes/${quote.id}`}>
                  <button className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                    <Printer size={16}/> Proposta
                  </button>
                </Link>

                {quote.status === 'DRAFT' && (
                  <>
                    <form action={async () => { "use server"; await approveQuote(quote.id); }}>
                      <button type="submit" className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                        <Check size={16}/> Aprovar (OS)
                      </button>
                    </form>

                    <form action={async () => { "use server"; await rejectQuote(quote.id); }}>
                      <button type="submit" className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                        <X size={16}/>
                      </button>
                    </form>
                  </>
                )}
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
