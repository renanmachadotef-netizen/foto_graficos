import { PrismaClient } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveQuote, rejectQuote } from "./actions";
import { Check, X, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function QuotesListPage() {
  const quotes = await prisma.quote.findMany({
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Meus Orçamentos</h1>
        <p className="text-muted-foreground">Gerencie propostas enviadas e aprove-as para gerar Ordens de Serviço.</p>
      </div>

      <div className="grid gap-4">
        {quotes.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
            <p className="text-slate-500">Você ainda não gerou nenhum orçamento na Calculadora.</p>
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
                </div>
                <p className="text-sm text-slate-500 mb-1"><strong>Produto:</strong> {quote.title}</p>
                <p className="text-xs text-slate-400">Gerado em: {quote.createdAt.toLocaleDateString('pt-BR')}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Valor Final</p>
                <p className="text-2xl font-black text-slate-800">R$ {quote.finalPrice.toFixed(2)}</p>
                <p className="text-xs text-green-600 font-semibold mt-1">Margem: {quote.markup}%</p>
              </div>

              <div className="flex flex-col gap-2 border-l border-slate-200 pl-6 w-full md:w-auto">
                <Link href={`/quotes/${quote.id}`} target="_blank" className="flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md text-sm font-bold transition-colors">
                  <Printer size={16} /> Ver Proposta (PDF)
                </Link>
                
                {quote.status === 'DRAFT' && (
                  <div className="flex gap-2">
                    <form action={async () => { "use server"; await approveQuote(quote.id); }} className="flex-1">
                      <button className="w-full flex justify-center items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-bold transition-colors">
                        <Check size={16} /> Aprovar
                      </button>
                    </form>
                    <form action={async () => { "use server"; await rejectQuote(quote.id); }}>
                      <button className="flex justify-center items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-bold transition-colors">
                        <X size={16} />
                      </button>
                    </form>
                  </div>
                )}
                
                {quote.status === 'APPROVED' && (
                  <Link href="/pcp" className="flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors">
                    Ver no PCP <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
