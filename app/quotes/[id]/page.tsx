import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

const prisma = new PrismaClient();

export default async function QuotePage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      items: true
    }
  });

  if (!quote) return notFound();

  const settings = await prisma.companySettings.findFirst() || {} as any;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      
      {/* Botão de impressão (escondido na hora de imprimir) */}
      <div className="max-w-[800px] mx-auto mb-4 flex justify-end print:hidden">
        <button 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors"
        >
          {/* O onClick no client side precisa ser simulado ou usamos script */}
          <Printer size={18} />
          Imprimir / Salvar PDF
        </button>
        <script dangerouslySetInnerHTML={{ __html: `document.querySelector('button').onclick = () => window.print()` }} />
      </div>

      {/* Papel A4 */}
      <div className="max-w-[800px] mx-auto bg-white p-12 shadow-xl print:shadow-none print:p-0 min-h-[1122px]">
        
        {/* Cabeçalho */}
        <header className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
              {settings.companyName || "SUA GRÁFICA AQUI"}
            </h1>
            <div className="text-sm text-slate-500 mt-2 space-y-1">
              {settings.document && <p>CNPJ: {settings.document}</p>}
              {settings.address && <p>{settings.address}</p>}
              {settings.phone && <p>Tel: {settings.phone}</p>}
              {settings.email && <p>E-mail: {settings.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest">Orçamento</h2>
            <p className="text-sm text-slate-500 mt-2"><strong>ID:</strong> #{quote.id.slice(-6).toUpperCase()}</p>
            <p className="text-sm text-slate-500"><strong>Data:</strong> {quote.createdAt.toLocaleDateString("pt-BR")}</p>
          </div>
        </header>

        {/* Dados do Cliente */}
        <section className="mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Dados do Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Nome / Razão Social</p>
              <p className="font-bold text-slate-800 text-lg">{quote.client.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Documento (CPF/CNPJ)</p>
              <p className="font-semibold text-slate-800">{quote.client.document || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">E-mail</p>
              <p className="font-semibold text-slate-800">{quote.client.email || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Telefone / WhatsApp</p>
              <p className="font-semibold text-slate-800">{quote.client.phone || "Não informado"}</p>
            </div>
          </div>
        </section>

        {/* Itens do Orçamento */}
        <section className="mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-800 uppercase text-xs tracking-wider">
                <th className="py-3 px-2 font-bold">Descrição do Item</th>
                <th className="py-3 px-2 font-bold text-center">Qtd</th>
                <th className="py-3 px-2 font-bold text-right">Valor Unit.</th>
                <th className="py-3 px-2 font-bold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-4 px-2 font-medium text-slate-800">{item.description}</td>
                  <td className="py-4 px-2 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-4 px-2 text-right text-slate-600">R$ {item.unitPrice.toFixed(2)}</td>
                  <td className="py-4 px-2 text-right font-bold text-slate-800">
                    R$ {(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totalizadores */}
        <section className="flex justify-end mb-16">
          <div className="w-80 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 text-slate-600">
              <span>Subtotal Itens</span>
              <span>R$ {quote.finalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xl border-t-2 border-slate-200 pt-4">
              <strong className="text-slate-800">Total Final</strong>
              <strong className="text-blue-600">R$ {quote.finalPrice.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        {/* Rodapé / Assinatura */}
        <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500 mb-16">
            Proposta válida por 15 dias. Valores sujeitos a alteração após o vencimento.
          </p>
          <div className="w-64 border-t border-slate-800 mx-auto pt-2">
            <p className="font-bold text-slate-800 text-sm">De Acordo / Assinatura do Cliente</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
