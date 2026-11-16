import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rotuloPagamento } from "@/lib/pagamentos";
import { BotaoImprimir } from "./BotaoImprimir";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Recibo do pagamento de uma conta a receber (fiado). So a equipe de vendas abre. */
export default async function ReciboFiadoPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!["ADMIN", "MANAGER", "SELLER"].includes(s.role)) notFound();
  const { id } = await params;
  const t = await prisma.financialTransaction.findUnique({ where: { id }, include: { client: { select: { name: true } } } });
  if (!t || t.type !== "INCOME" || t.status !== "PAID") notFound();
  const cfg = await prisma.companySettings.findFirst({ select: { companyName: true } });
  const loja = cfg?.companyName || "Foto & Gráficos";
  const quando = (t.paymentDate ?? t.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <main className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-slate-900 print:border-0 print:shadow-none">
        <p className="text-center font-bold text-lg">{loja}</p>
        <p className="text-center text-sm font-semibold uppercase tracking-wide">Recibo de pagamento</p>
        <hr className="border-dashed" />
        <p>
          Recebemos de <b>{t.client?.name ?? "cliente"}</b> a quantia de <b>{brl(t.amount)}</b>.
        </p>
        <p className="text-sm text-slate-600">Referente a: {t.description}</p>
        <p className="text-sm">
          Data: {quando}
          {t.paymentMethod ? ` • ${rotuloPagamento(t.paymentMethod)}` : ""}
        </p>
        <p className="text-center text-xs text-slate-500 pt-2">Obrigado pela preferência!</p>
        <BotaoImprimir />
      </div>
    </main>
  );
}
