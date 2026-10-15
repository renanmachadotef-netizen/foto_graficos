"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Package, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumoClientes {
  linhas: number;
  unicos: number;
  duplicatasJuntadas: number;
  devedores: number;
  totalFiado: number;
  comCredito: number;
  totalCredito: number;
  comTelefone: number;
}
interface ResumoProdutos {
  total: number;
  semCusto: number;
  precoZero: number;
  categorias: Record<string, number>;
}
interface PreviaBanco {
  clientesNovos: number;
  clientesExistentes: number;
  produtosNovos: number;
  produtosExistentes: number;
  fiadoJaImportado: number;
  demoClientes: number;
  demoProdutos: number;
}
interface Relatorio {
  clientesNovos: number;
  clientesAtualizados: number;
  fiadoCriado: number;
  fiadoJaExistia: number;
  totalFiadoCriado: number;
  creditosAtualizados: number;
  produtosNovos: number;
  produtosJaExistiam: number;
  demoClientesRemovidos: number;
  demoProdutosRemovidos: number;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number) => n.toLocaleString("pt-BR");

export function ImportarClientView() {
  const [arqClientes, setArqClientes] = useState<File | null>(null);
  const [arqProdutos, setArqProdutos] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{ clientes: ResumoClientes | null; produtos: ResumoProdutos | null; banco: PreviaBanco } | null>(null);
  const [removerDemo, setRemoverDemo] = useState(true);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const inC = useRef<HTMLInputElement>(null);
  const inP = useRef<HTMLInputElement>(null);

  function montar(acao: "previa" | "aplicar") {
    const fd = new FormData();
    fd.append("acao", acao);
    if (arqClientes) fd.append("clientes", arqClientes);
    if (arqProdutos) fd.append("produtos", arqProdutos);
    if (acao === "aplicar" && removerDemo) fd.append("removerDemo", "1");
    return fd;
  }

  async function ver() {
    setErro(null);
    setPrevia(null);
    setRelatorio(null);
    setLendo(true);
    try {
      const r = await fetch("/api/importar", { method: "POST", body: montar("previa") });
      const j = await r.json();
      if (!j.ok) setErro(j.erro || "Não consegui ler as planilhas.");
      else setPrevia({ clientes: j.clientes, produtos: j.produtos, banco: j.banco });
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    }
    setLendo(false);
  }

  async function importar() {
    setErro(null);
    setImportando(true);
    try {
      const r = await fetch("/api/importar", { method: "POST", body: montar("aplicar") });
      const j = await r.json();
      if (!j.ok) setErro(j.erro || "A importação falhou.");
      else {
        setRelatorio(j.relatorio);
        setPrevia(null);
      }
    } catch {
      setErro("Falha de conexão. A importação pode ter sido interrompida: confira clientes e produtos antes de repetir.");
    }
    setImportando(false);
  }

  const temArquivo = !!(arqClientes || arqProdutos);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Trazer dados do NEX</h1>
        <p className="text-muted-foreground mt-1">
          Envie as planilhas que você exportou do NEX. Pode repetir quantas vezes quiser: nada fica duplicado.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Caixa
          icone={<Users className="size-8" />}
          titulo="Clientes"
          dica="Planilha “Clientes” do NEX"
          arquivo={arqClientes}
          onEscolher={() => inC.current?.click()}
        />
        <Caixa
          icone={<Package className="size-8" />}
          titulo="Produtos"
          dica="Planilha “Produtos” do NEX"
          arquivo={arqProdutos}
          onEscolher={() => inP.current?.click()}
        />
        <input ref={inC} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => { setArqClientes(e.target.files?.[0] ?? null); setPrevia(null); setRelatorio(null); e.target.value = ""; }} />
        <input ref={inP} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => { setArqProdutos(e.target.files?.[0] ?? null); setPrevia(null); setRelatorio(null); e.target.value = ""; }} />
      </div>

      <Button size="lg" onClick={ver} disabled={!temArquivo || lendo || importando} className="w-full cursor-pointer">
        {lendo ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Ver o que vai entrar
      </Button>

      {erro && (
        <div className="rounded-xl bg-rose-100 text-rose-800 px-4 py-3 font-semibold flex gap-2">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {previa && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="text-xl font-semibold">Confira antes de importar</h2>

          {previa.clientes && (
            <div className="space-y-2">
              <p className="font-semibold flex items-center gap-2"><Users className="size-5" /> Clientes</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><b className="text-foreground">{num(previa.clientes.unicos)}</b> clientes diferentes (a planilha tinha {num(previa.clientes.linhas)} linhas; {num(previa.clientes.duplicatasJuntadas)} eram repetidos e foram juntados)</li>
                <li>{num(previa.banco.clientesNovos)} novos • {num(previa.banco.clientesExistentes)} já cadastrados (serão atualizados)</li>
                <li>{num(previa.clientes.comTelefone)} com telefone</li>
              </ul>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-3">
                <Wallet className="size-6 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">
                    {num(previa.clientes.devedores)} clientes devendo • {brl(previa.clientes.totalFiado)} de fiado
                  </p>
                  <p className="text-sm text-amber-800">
                    Cada um vira uma conta a receber (“Fiado antigo”). {previa.clientes.comCredito > 0 && `${num(previa.clientes.comCredito)} clientes têm crédito (${brl(previa.clientes.totalCredito)}).`}
                    {previa.banco.fiadoJaImportado > 0 && ` ${num(previa.banco.fiadoJaImportado)} já estavam importados e não serão repetidos.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {previa.produtos && (
            <div className="space-y-2">
              <p className="font-semibold flex items-center gap-2"><Package className="size-5" /> Produtos</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><b className="text-foreground">{num(previa.produtos.total)}</b> produtos • {num(previa.banco.produtosNovos)} novos • {num(previa.banco.produtosExistentes)} já cadastrados (ficam como estão)</li>
                <li className="text-amber-700 font-medium">
                  {num(previa.produtos.semCusto)} estão sem custo e {num(previa.produtos.precoZero)} sem preço: o próximo passo é preencher o custo de cada um.
                </li>
              </ul>
            </div>
          )}

          {(previa.banco.demoClientes > 0 || previa.banco.demoProdutos > 0) && (
            <label className="flex items-start gap-3 rounded-xl bg-muted/50 p-3 cursor-pointer">
              <input type="checkbox" checked={removerDemo} onChange={(e) => setRemoverDemo(e.target.checked)} className="mt-1 size-5" />
              <span className="text-sm">
                <b>Remover os exemplos</b> que vieram com o sistema ({previa.banco.demoClientes} clientes e {previa.banco.demoProdutos} produtos de mentirinha). Só apaga os que nunca foram usados.
              </span>
            </label>
          )}

          <Button size="lg" onClick={importar} disabled={importando} className="w-full cursor-pointer">
            {importando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {importando ? "Importando…" : "Importar agora"}
          </Button>
        </div>
      )}

      {relatorio && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 space-y-3">
          <p className="text-xl font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="size-6" /> Pronto! Dados importados.
          </p>
          <ul className="text-emerald-900 space-y-1">
            <li>👥 {num(relatorio.clientesNovos)} clientes novos • {num(relatorio.clientesAtualizados)} atualizados</li>
            <li>💸 {num(relatorio.fiadoCriado)} fiados criados ({brl(relatorio.totalFiadoCriado)}){relatorio.fiadoJaExistia > 0 && ` • ${num(relatorio.fiadoJaExistia)} já existiam`}</li>
            <li>📦 {num(relatorio.produtosNovos)} produtos novos • {num(relatorio.produtosJaExistiam)} já existiam</li>
            {(relatorio.demoClientesRemovidos > 0 || relatorio.demoProdutosRemovidos > 0) && (
              <li>🧹 {relatorio.demoClientesRemovidos} clientes e {relatorio.demoProdutosRemovidos} produtos de exemplo removidos</li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/receber" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
              Ver quem me deve
            </Link>
            <Link href="/clients" className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 font-semibold">
              Ver clientes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Caixa({
  icone,
  titulo,
  dica,
  arquivo,
  onEscolher,
}: {
  icone: React.ReactNode;
  titulo: string;
  dica: string;
  arquivo: File | null;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
        arquivo ? "border-emerald-400 bg-emerald-50" : "border-border bg-muted/40 hover:border-primary"
      }`}
    >
      <div className="mx-auto w-fit text-muted-foreground">{arquivo ? <CheckCircle2 className="size-8 text-emerald-600" /> : icone}</div>
      <p className="font-semibold mt-2">{titulo}</p>
      <p className="text-sm text-muted-foreground">{arquivo ? arquivo.name : dica}</p>
      <p className="text-sm font-medium mt-2 text-primary">{arquivo ? "Trocar arquivo" : "Escolher arquivo"}</p>
    </button>
  );
}
