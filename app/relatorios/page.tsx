import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERIODOS, intervalo, lucratividade, porFormaPagamento, rankingClientes, resumo, type Periodo } from "./dados";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }));
const dataCurta = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const dataLonga = (ymd: string) => new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

const ABAS = [
  { v: "resumo", l: "Resumo" },
  { v: "lucro", l: "Lucro por produto" },
  { v: "pagamentos", l: "Formas de pagamento" },
  { v: "clientes", l: "Clientes" },
] as const;
type Aba = (typeof ABAS)[number]["v"];

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ p?: string; aba?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!["ADMIN", "MANAGER"].includes(s.role)) redirect("/");

  const sp = await searchParams;
  const periodo: Periodo = PERIODOS.some((x) => x.v === sp.p) ? (sp.p as Periodo) : "30d";
  const aba: Aba = ABAS.some((x) => x.v === sp.aba) ? (sp.aba as Aba) : "resumo";
  const { de, ate } = intervalo(periodo);
  const href = (p: string, a: string) => `/relatorios?p=${p}&aba=${a}`;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Relatórios</h1>
        <p className="text-muted-foreground">
          {dataCurta(de)} a {dataCurta(ate)} · só vendas fechadas (pedidos em aberto e cancelados ficam de fora do faturamento)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((x) => (
          <Link key={x.v} href={href(x.v, aba)} className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${x.v === periodo ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {x.l}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {ABAS.map((x) => (
          <Link key={x.v} href={href(periodo, x.v)} className={`px-3 py-2 text-sm font-semibold -mb-px border-b-2 ${x.v === aba ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {x.l}
          </Link>
        ))}
      </div>

      {aba === "resumo" && <AbaResumo de={de} ate={ate} />}
      {aba === "lucro" && <AbaLucro de={de} ate={ate} />}
      {aba === "pagamentos" && <AbaPagamentos de={de} ate={ate} />}
      {aba === "clientes" && <AbaClientes de={de} ate={ate} />}
    </div>
  );
}

function Cartao({ titulo, valor, nota, cor }: { titulo: string; valor: string; nota?: string; cor?: string }) {
  return (
    <div className="bg-card border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
      <p className={`text-2xl font-bold mt-1 ${cor ?? "text-slate-900"}`}>{valor}</p>
      {nota && <p className="text-xs text-slate-500 mt-0.5">{nota}</p>}
    </div>
  );
}

async function AbaResumo({ de, ate }: { de: string; ate: string }) {
  const r = await resumo(de, ate);
  const max = Math.max(1, ...r.porDia.map((d) => d.total));
  const W = 720;
  const H = 180;
  const n = r.porDia.length;
  const bw = Math.max(2, Math.min(28, (W - 20) / n - 3));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao titulo="Faturamento" valor={brl(r.faturamento)} />
        <Cartao titulo="Vendas" valor={String(r.vendas)} nota={r.vendas ? `ticket médio ${brl(r.ticket)}` : undefined} />
        <Cartao titulo="Lucro bruto" valor={brl(r.lucro)} nota={r.margem != null ? `margem ${r.margem.toFixed(0)}% (só itens com custo)` : "sem custo nos itens"} cor={r.lucro < 0 ? "text-red-600" : "text-emerald-700"} />
        <Cartao titulo="Fiado" valor={brl(r.fiadoVendido)} nota={`recebido no período: ${brl(r.fiadoRecebido)}`} />
      </div>

      <div className="bg-card border border-slate-200 rounded-xl p-4">
        <h2 className="font-bold text-slate-800 mb-2">Faturamento por dia</h2>
        <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full h-auto" role="img" aria-label="Faturamento por dia">
          {r.porDia.map((d, i) => {
            const h = (d.total / max) * H;
            const x = 10 + (i * (W - 20)) / n + ((W - 20) / n - bw) / 2;
            return (
              <g key={d.dia}>
                <title>{`${dataLonga(d.dia)}: ${brl(d.total)} (${d.vendas} venda${d.vendas === 1 ? "" : "s"})`}</title>
                <rect x={x} y={H - h} width={bw} height={Math.max(h, d.total > 0 ? 2 : 0)} rx="3" fill="#4f46e5" opacity={d.total > 0 ? 1 : 0.15} />
              </g>
            );
          })}
          <line x1="10" x2={W - 10} y1={H} y2={H} stroke="#cbd5e1" />
          <text x="10" y={H + 16} fontSize="11" fill="#64748b">{dataCurta(r.porDia[0].dia)}</text>
          <text x={W - 10} y={H + 16} fontSize="11" fill="#64748b" textAnchor="end">{dataCurta(r.porDia[n - 1].dia)}</text>
        </svg>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 mt-2">
          {r.maiorDia && <span>Melhor dia: <strong>{dataLonga(r.maiorDia.dia)}</strong> ({brl(r.maiorDia.total)})</span>}
          {r.menorDia && r.menorDia.dia !== r.maiorDia?.dia && <span>Mais fraco: <strong>{dataLonga(r.menorDia.dia)}</strong> ({brl(r.menorDia.total)})</span>}
        </div>
      </div>

      <details className="bg-card border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer">Ver os números dia a dia</summary>
        <div className="divide-y divide-slate-100 text-sm">
          {[...r.porDia].reverse().map((d) => (
            <div key={d.dia} className="px-4 py-2 flex justify-between">
              <span>{dataLonga(d.dia)}</span>
              <span className="text-slate-500">{d.vendas} venda{d.vendas === 1 ? "" : "s"}</span>
              <strong>{brl(d.total)}</strong>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

async function AbaLucro({ de, ate }: { de: string; ate: string }) {
  const linhas = await lucratividade(de, ate);
  const semCusto = linhas.filter((l) => l.semCusto).length;
  return (
    <div className="space-y-3">
      {semCusto > 0 && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{semCusto} produto(s) vendido(s) sem custo cadastrado: o lucro deles aparece cheio. Cadastre o custo em Produtos ou na Calculadora de Preço.</p>}
      <div className="bg-card border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr><th className="text-left p-3">Produto</th><th className="text-right p-3">Qtd</th><th className="text-right p-3">Receita</th><th className="text-right p-3">Custo</th><th className="text-right p-3">Lucro</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma venda no período.</td></tr>}
            {linhas.map((l, i) => (
              <tr key={i}>
                <td className="p-3">{l.nome}{l.semCusto && <span className="ml-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5">sem custo</span>}</td>
                <td className="p-3 text-right">{qtd(l.quantidade)}</td>
                <td className="p-3 text-right">{brl(l.receita)}</td>
                <td className="p-3 text-right text-slate-500">{brl(l.custo)}</td>
                <td className={`p-3 text-right font-bold ${l.lucro < 0 ? "text-red-600" : "text-emerald-700"}`}>{brl(l.lucro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function AbaPagamentos({ de, ate }: { de: string; ate: string }) {
  const { linhas, abertos, valorAberto } = await porFormaPagamento(de, ate);
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <div className="space-y-3">
      <div className="bg-card border border-slate-200 rounded-xl divide-y divide-slate-100">
        {linhas.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Nenhum pagamento no período.</p>}
        {linhas.map((l) => (
          <div key={l.forma} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{l.forma}</p>
              <div className="h-1.5 bg-slate-100 rounded mt-1.5"><div className="h-1.5 bg-indigo-500 rounded" style={{ width: `${total > 0 ? (l.valor / total) * 100 : 0}%` }} /></div>
            </div>
            <p className="text-xs text-slate-500">{l.qtd} pgto{l.qtd === 1 ? "" : "s"}</p>
            <p className="font-bold w-28 text-right">{brl(l.valor)}</p>
          </div>
        ))}
        {linhas.length > 0 && <div className="p-3 flex justify-between font-bold"><span>Total que entrou</span><span>{brl(total)}</span></div>}
      </div>
      {abertos > 0 && <p className="text-sm text-slate-600">À parte: {abertos} pedido(s) ainda aberto(s) no período, somando {brl(valorAberto)}. Entram aqui só os valores que já foram pagos.</p>}
    </div>
  );
}

async function AbaClientes({ de, ate }: { de: string; ate: string }) {
  const linhas = await rankingClientes(de, ate);
  return (
    <div className="bg-card border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr><th className="text-left p-3">#</th><th className="text-left p-3">Cliente</th><th className="text-right p-3">Compras</th><th className="text-right p-3">Total</th><th className="text-right p-3">Deve hoje</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {linhas.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma venda para cliente identificado no período.</td></tr>}
          {linhas.map((l, i) => (
            <tr key={i}>
              <td className="p-3 text-slate-400">{i + 1}</td>
              <td className="p-3 font-medium">{l.nome}</td>
              <td className="p-3 text-right">{l.compras}</td>
              <td className="p-3 text-right font-bold">{brl(l.total)}</td>
              <td className={`p-3 text-right ${l.deve > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>{l.deve > 0 ? brl(l.deve) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
