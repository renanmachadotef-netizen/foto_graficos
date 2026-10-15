// PIX "copia e cola" (BR Code estatico) com valor. Nao precisa de integracao com banco:
// o cliente escaneia, o valor ja vem preenchido e o dinheiro cai direto na conta da chave.
// A confirmacao do pagamento e feita por quem vende (ver o app do banco).

function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .\-]/g, "").replace(/\s+/g, " ").trim();
}

export interface DadosPix {
  chave: string;
  valor?: number; // em reais; sem valor = o cliente digita
  nome: string; // quem recebe (ate 25 letras)
  cidade: string; // ate 15 letras
  identificador?: string; // ate 25 letras/numeros (ex.: numero da venda)
}

export function gerarPix(d: DadosPix): string {
  const chave = d.chave.trim();
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const txid = (d.identificador || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const partes = [
    campo("00", "01"),
    campo("26", conta),
    campo("52", "0000"),
    campo("53", "986"),
    d.valor && d.valor > 0 ? campo("54", d.valor.toFixed(2)) : "",
    campo("58", "BR"),
    campo("59", semAcento(d.nome).toUpperCase().slice(0, 25) || "LOJA"),
    campo("60", semAcento(d.cidade).toUpperCase().slice(0, 15) || "BRASIL"),
    campo("62", campo("05", txid)),
  ].join("");
  const semCrc = partes + "6304";
  return semCrc + crc16(semCrc);
}
