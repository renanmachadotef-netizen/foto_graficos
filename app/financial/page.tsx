import { PrismaClient } from "@prisma/client";
import { StatementUpload } from "./StatementUpload";
import { Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { deleteTransaction, updateCompanySettings } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const prisma = new PrismaClient();

export default async function FinancialPage() {
  const transactions = await prisma.financialTransaction.findMany({
    orderBy: { date: 'desc' },
    take: 50
  });

  // Cálculo básico de Receitas vs Despesas do mês
  const incomes = transactions.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Financeiro & Ponto de Equilíbrio</h1>
        <p className="text-muted-foreground">Monitore o caixa da empresa e os custos fixos.</p>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-600 text-white shadow-md border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center justify-between">
              Entradas (Receitas) <TrendingUp size={16} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {incomes.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white shadow-md border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-100 flex items-center justify-between">
              Saídas (Despesas) <TrendingDown size={16} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {expenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 text-white shadow-md border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
              Saldo Bruto <DollarSign size={16} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {(incomes - expenses).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-6">
          <StatementUpload />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ponto de Equilíbrio Mensal</CardTitle>
              <p className="text-xs text-slate-500">Valor necessário para "empatar" no zero.</p>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Isso conectaria ao CompanySettings futuramente */}
               <div className="flex justify-between items-center text-sm border-b pb-2">
                 <span>Aluguel</span>
                 <span className="font-bold text-slate-700">R$ 2.500,00</span>
               </div>
               <div className="flex justify-between items-center text-sm border-b pb-2">
                 <span>Internet / Telefone</span>
                 <span className="font-bold text-slate-700">R$ 300,00</span>
               </div>
               <div className="flex justify-between items-center text-sm border-b pb-2">
                 <span>Folha Base (Funcionários)</span>
                 <span className="font-bold text-slate-700">Automático</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="font-bold text-slate-800">Custo Fixo Total Estimado</span>
                 <span className="font-bold text-red-500 text-lg">R$ 2.800,00</span>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Column */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Lançamentos Recentes</h2>
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-left p-4 font-semibold">Descrição</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum lançamento importado.</td>
                  </tr>
                )}
                {transactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-4 text-slate-600">{t.date.toLocaleDateString("pt-BR")}</td>
                    <td className="p-4 font-medium text-slate-800">{t.description}</td>
                    <td className={`p-4 text-right font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                       <form action={async () => { "use server"; await deleteTransaction(t.id); }}>
                         <button type="submit" className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
