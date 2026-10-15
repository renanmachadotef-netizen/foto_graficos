/** Texto de busca: minusculas, sem acento, so letras e numeros separados por espaco. */
export function normalizarBusca(...partes: (string | null | undefined)[]): string {
  return partes
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
