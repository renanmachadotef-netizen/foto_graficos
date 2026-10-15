import { acharLinhaNoTexto, lerLinhaDigitavel, soDigitos } from "./boleto";

export interface DadosBoleto {
  fornecedor: string | null;
  valor: number | null;
  vencimento: string | null; // YYYY-MM-DD
  linha: string | null; // so digitos
  descricao: string | null;
  categoria: string | null;
  origem: "ia" | "linha" | "ia+linha" | "nenhuma";
  aviso: string | null; // motivo quando a leitura automatica falhou
}

const CATEGORIAS = [
  "Energia",
  "Água",
  "Internet/Telefone",
  "Aluguel",
  "Fornecedores",
  "Impostos",
  "Funcionários",
  "Contador",
  "Manutenção",
  "Marketing",
  "Outros",
];

let modeloEmCache: { nome: string; ate: number } | null = null;

async function escolherModelo(chave: string): Promise<string> {
  if (modeloEmCache && modeloEmCache.ate > Date.now()) return modeloEmCache.nome;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${chave}`);
  if (!r.ok) throw new Error("Chave do Gemini invalida ou sem permissao.");
  const j = await r.json();
  const nomes: string[] = (j.models || [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: { name: string }) => m.name);
  const doEnv = (process.env.GEMINI_MODEL || "").replace(/^models\//, "");
  const preferidos = [doEnv ? `models/${doEnv}` : "", "models/gemini-2.5-flash", "models/gemini-flash-latest"];
  const estaveis = nomes.filter((n) => /flash/.test(n) && !/(lite|preview|exp|thinking|image|tts|live|audio|omni|robotics)/.test(n));
  const nome = preferidos.find((n) => n && nomes.includes(n)) || estaveis[0] || nomes.find((n) => /gemini/.test(n));
  if (!nome) throw new Error("Nenhum modelo do Gemini disponivel para esta chave.");
  modeloEmCache = { nome, ate: Date.now() + 60 * 60 * 1000 };
  return nome;
}

function limparJson(txt: string): string {
  return txt.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function perguntarAoGemini(arquivo: Buffer, mime: string): Promise<Record<string, unknown> | null> {
  const chave = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
  if (!chave) return null;
  const modelo = await escolherModelo(chave);
  const hoje = new Date().toISOString().slice(0, 10);
  const instrucao = `Voce le boletos de cobranca, faturas e contas (energia, agua, telefone, fornecedores) do Brasil.
Hoje e ${hoje}. Extraia do documento e responda SOMENTE um JSON com estas chaves:
{
  "fornecedor": "nome de quem esta cobrando (beneficiario/empresa), curto",
  "valor": numero em reais (ex.: 123.45) ou null,
  "vencimento": "AAAA-MM-DD" ou null,
  "linha_digitavel": "somente a sequencia numerica da linha digitavel (47 ou 48 digitos) ou null",
  "descricao": "o que e a conta, em poucas palavras (ex.: Conta de energia - setembro)",
  "categoria": uma destas: ${CATEGORIAS.join(", ")}
}
Nao invente: se nao achar um campo, use null.`;

  const corpo = {
    contents: [
      {
        role: "user",
        parts: [{ text: instrucao }, { inline_data: { mime_type: mime, data: arquivo.toString("base64") } }],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelo}:generateContent?key=${chave}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).replace(/\s+/g, " ").slice(0, 200)}`);
  const j = await r.json();
  const partes: { text?: string; thought?: boolean }[] = j.candidates?.[0]?.content?.parts ?? [];
  const texto = partes.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
  if (!texto) return null;
  return JSON.parse(limparJson(texto));
}

function aData(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function aNumero(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Le um boleto (PDF ou foto). A linha digitavel, quando valida, manda no valor e no vencimento. */
export async function lerBoletoDoArquivo(arquivo: Buffer, mime: string): Promise<DadosBoleto> {
  let ia: Record<string, unknown> | null = null;
  let aviso: string | null = null;
  try {
    ia = await perguntarAoGemini(arquivo, mime);
    if (!ia) aviso = process.env.GEMINI_API_KEY ? "A IA nao devolveu dados." : "Leitura automatica desligada (sem chave da IA).";
  } catch (e) {
    ia = null; // sem IA o usuario preenche na conferencia
    aviso = e instanceof Error ? e.message : "Falha ao ler o boleto.";
  }

  const textoLinha = ia && typeof ia.linha_digitavel === "string" ? ia.linha_digitavel : "";
  const linha = textoLinha ? (acharLinhaNoTexto(textoLinha) || soDigitos(textoLinha)) : "";
  const decodificada = linha ? lerLinhaDigitavel(linha) : null;

  const categoria =
    ia && typeof ia.categoria === "string" && CATEGORIAS.includes(ia.categoria) ? ia.categoria : null;

  const dados: DadosBoleto = {
    fornecedor: ia && typeof ia.fornecedor === "string" ? ia.fornecedor.slice(0, 80) : null,
    valor: decodificada?.valor ?? aNumero(ia?.valor),
    vencimento: decodificada?.vencimento ?? aData(ia?.vencimento),
    linha: decodificada ? decodificada.linha : null,
    descricao: ia && typeof ia.descricao === "string" ? ia.descricao.slice(0, 120) : null,
    categoria,
    origem: "nenhuma",
    aviso,
  };
  dados.origem = decodificada ? (ia ? "ia+linha" : "linha") : ia ? "ia" : "nenhuma";
  return dados;
}

export { CATEGORIAS };
