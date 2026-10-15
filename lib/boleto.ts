// Leitura da linha digitavel de boletos (bancarios e de concessionarias).
// O valor e o vencimento sao calculados pelos proprios numeros: nao dependem de IA.

export interface BoletoInfo {
  linha: string; // so digitos
  tipo: "banco" | "convenio";
  valor: number | null; // reais; null = boleto sem valor definido
  vencimento: string | null; // YYYY-MM-DD; null quando o boleto nao traz data
}

export function soDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

function mod10(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    const p = Number(num[i]) * peso;
    soma += p > 9 ? Math.floor(p / 10) + (p % 10) : p;
    peso = peso === 2 ? 1 : 2;
  }
  const r = soma % 10;
  return r === 0 ? 0 : 10 - r;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Fator de vencimento: dias desde 07/10/1997. O ciclo reiniciou em 22/02/2025 (fator 1000),
// entao o mesmo fator pode significar duas datas; escolhe a mais proxima de hoje.
function dataDoFator(fator: number, hoje: Date): string | null {
  if (fator <= 0) return null;
  const base = Date.UTC(1997, 9, 7);
  const dia = 86400000;
  const candidatas = [0, 9000].map((ciclo) => new Date(base + (fator + ciclo) * dia));
  const alvo = hoje.getTime();
  const validas = candidatas.filter(
    (d) => d.getTime() > alvo - 400 * dia && d.getTime() < alvo + 800 * dia,
  );
  const lista = validas.length ? validas : candidatas;
  lista.sort((a, b) => Math.abs(a.getTime() - alvo) - Math.abs(b.getTime() - alvo));
  return ymd(lista[0]);
}

export function lerLinhaDigitavel(bruto: string, hoje: Date = new Date()): BoletoInfo | null {
  const d = soDigitos(bruto);

  if (d.length === 47) {
    // confere os digitos verificadores dos 3 primeiros campos
    const campos: Array<[string, string]> = [
      [d.slice(0, 9), d[9]],
      [d.slice(10, 20), d[20]],
      [d.slice(21, 31), d[31]],
    ];
    if (!campos.every(([c, dv]) => mod10(c) === Number(dv))) return null;
    const fator = Number(d.slice(33, 37));
    const valorCent = Number(d.slice(37, 47));
    return {
      linha: d,
      tipo: "banco",
      valor: valorCent > 0 ? valorCent / 100 : null,
      vencimento: dataDoFator(fator, hoje),
    };
  }

  if (d.length === 48 && d[0] === "8") {
    // 4 blocos de 11 digitos + 1 verificador; tira os verificadores para chegar ao codigo de barras
    const blocos = [0, 12, 24, 36].map((i) => d.slice(i, i + 11));
    const codigo = blocos.join("");
    const indicador = codigo[2]; // 6/7 = valor efetivo; 8/9 = valor de referencia
    const valorCent = Number(codigo.slice(4, 15));
    const efetivo = indicador === "6" || indicador === "7";
    return {
      linha: d,
      tipo: "convenio",
      valor: efetivo && valorCent > 0 ? valorCent / 100 : null,
      vencimento: null,
    };
  }

  return null;
}

/** Procura uma linha digitavel dentro de um texto qualquer (ex.: texto de um PDF). */
export function acharLinhaNoTexto(texto: string): string | null {
  const padroes = [
    /\d{5}[.\s]?\d{5}\s+\d{5}[.\s]?\d{6}\s+\d{5}[.\s]?\d{6}\s+\d\s+\d{14}/,
    /\d{11}-?\d\s+\d{11}-?\d\s+\d{11}-?\d\s+\d{11}-?\d/,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m) return soDigitos(m[0]);
  }
  return null;
}

/** Formata a linha digitavel para leitura humana. */
export function formatarLinha(linha: string): string {
  const d = soDigitos(linha);
  if (d.length === 47) {
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d[32]} ${d.slice(33)}`;
  }
  if (d.length === 48) {
    return [0, 12, 24, 36].map((i) => `${d.slice(i, i + 11)}-${d[i + 11]}`).join(" ");
  }
  return linha;
}
