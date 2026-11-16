import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download } from "lucide-react";

const ITENS = [
  { tipo: "clientes", l: "Clientes" },
  { tipo: "produtos", l: "Produtos e estoque" },
  { tipo: "vendas", l: "Vendas" },
  { tipo: "itens", l: "Itens das vendas" },
  { tipo: "fiado", l: "Contas a receber (fiado)" },
  { tipo: "contas", l: "Contas a pagar" },
  { tipo: "estoque", l: "Histórico do estoque" },
];

/** Links de download (cada um abre um CSV para o Excel). Só aparece para o administrador. */
export function BaixarDados() {
  return (
    <Card className="max-w-2xl border-slate-200 bg-card shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold text-slate-900">Baixar meus dados</CardTitle>
        <CardDescription className="text-xs text-slate-500">Planilhas CSV que abrem direto no Excel em português. Úteis como cópia de segurança.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5 flex flex-wrap gap-2">
        {ITENS.map((i) => (
          <a key={i.tipo} href={`/api/exportar/${i.tipo}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-indigo-300">
            <Download className="w-4 h-4" /> {i.l}
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
