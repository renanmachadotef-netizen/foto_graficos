import { notFound } from "next/navigation";
import { lerArtePublica } from "@/app/arte/actions";
import { FormResposta } from "./FormResposta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aprovar arte", robots: { index: false, follow: false } };

export default async function AprovarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await lerArtePublica(token);
  if (!a) notFound();

  const arquivo = `/api/arte/${a.token}`;
  return (
    <main className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-500">{a.loja}</p>
          <h1 className="text-2xl font-bold text-slate-900">Aprovação da arte{a.pedido ? ` do pedido #${a.pedido}` : ""}</h1>
          <p className="text-sm text-slate-500">Versão {a.versao} · {a.nome}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
          {a.mime === "application/pdf" ? (
            <iframe src={arquivo} title="Arte em PDF" className="w-full h-[70vh] rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arquivo} alt={`Arte ${a.nome}`} className="w-full h-auto rounded-xl" />
          )}
          <a href={arquivo} target="_blank" rel="noopener" className="block text-center text-sm text-indigo-600 font-semibold py-2">
            Abrir em tela cheia
          </a>
        </div>

        {a.resposta ? (
          <div className={`rounded-2xl border p-4 text-center ${a.resposta === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
            <p className="font-bold text-lg">{a.resposta === "approved" ? "Arte aprovada. Obrigado!" : "Pedido de ajuste enviado."}</p>
            {a.comentario && <p className="mt-1 text-sm">“{a.comentario}”</p>}
            {a.respondidaEm && <p className="mt-1 text-xs opacity-70">Respondido em {new Date(a.respondidaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</p>}
          </div>
        ) : !a.aberto ? (
          <p className="text-center text-slate-600 bg-white border border-slate-200 rounded-2xl p-4">Esse pedido já foi entregue ou cancelado, então não aceita mais resposta.</p>
        ) : (
          <FormResposta token={a.token} />
        )}
      </div>
    </main>
  );
}
