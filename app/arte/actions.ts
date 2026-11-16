"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function equipe() {
  const s = await getSession();
  return s && ["ADMIN", "MANAGER", "SELLER"].includes(s.role) ? s : null;
}

export interface ArteLinha {
  id: string;
  token: string;
  nome: string;
  versao: number;
  enviada: string;
  resposta: "approved" | "changes" | null;
  comentario: string | null;
  respondidaEm: string | null;
}

/** Artes de um pedido (da loja). Abrir o pedido marca as respostas como vistas. */
export async function listarArtes(quoteId: string, marcarVistas = true): Promise<ArteLinha[]> {
  if (!(await equipe())) return [];
  if (marcarVistas) {
    await prisma.quoteArt.updateMany({ where: { quoteId, response: { not: null }, seenAt: null }, data: { seenAt: new Date() } });
  }
  const l = await prisma.quoteArt.findMany({
    where: { quoteId },
    orderBy: { version: "desc" },
    select: { id: true, token: true, name: true, version: true, createdAt: true, response: true, responseComment: true, respondedAt: true },
  });
  return l.map((a) => ({
    id: a.id,
    token: a.token,
    nome: a.name,
    versao: a.version,
    enviada: a.createdAt.toISOString(),
    resposta: a.response === "approved" || a.response === "changes" ? a.response : null,
    comentario: a.responseComment,
    respondidaEm: a.respondedAt?.toISOString() ?? null,
  }));
}

export async function excluirArte(id: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!(await equipe())) return { ok: false, erro: "Sem permissao." };
  const a = await prisma.quoteArt.findUnique({ where: { id }, select: { response: true } });
  if (!a) return { ok: false, erro: "Arte nao encontrada." };
  if (a.response) return { ok: false, erro: "Essa arte ja foi respondida pelo cliente e fica no historico." };
  await prisma.quoteArt.delete({ where: { id } });
  return { ok: true };
}

/** Quantas respostas de arte ninguem da loja viu ainda (aviso no menu). */
export async function artesNaoVistas(): Promise<number> {
  return prisma.quoteArt.count({ where: { response: { not: null }, seenAt: null } });
}

export interface ArtePublica {
  token: string;
  nome: string;
  mime: string;
  versao: number;
  pedido: number | null;
  loja: string;
  resposta: "approved" | "changes" | null;
  comentario: string | null;
  respondidaEm: string | null;
  aberto: boolean; // o pedido ainda aceita resposta
}

/** Dados da pagina publica do cliente. O link (token) e a unica chave. */
export async function lerArtePublica(token: string): Promise<ArtePublica | null> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return null;
  const a = await prisma.quoteArt.findUnique({
    where: { token },
    select: { token: true, name: true, mime: true, version: true, response: true, responseComment: true, respondedAt: true, quote: { select: { number: true, status: true } } },
  });
  if (!a) return null;
  const cfg = await prisma.companySettings.findFirst({ select: { companyName: true } });
  return {
    token: a.token,
    nome: a.name,
    mime: a.mime,
    versao: a.version,
    pedido: a.quote.number,
    loja: cfg?.companyName || "Foto & Gráficos",
    resposta: a.response === "approved" || a.response === "changes" ? a.response : null,
    comentario: a.responseComment,
    respondidaEm: a.respondedAt?.toISOString() ?? null,
    aberto: a.quote.status === "OPEN",
  };
}

/** O cliente aprova ou pede ajuste, uma vez so e so com o pedido aberto. Aprovar leva o pedido de "aguardando" para a pre-impressao. */
export async function responderArte(token: string, resposta: "approved" | "changes", comentario: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return { ok: false, erro: "Link invalido." };
  if (resposta !== "approved" && resposta !== "changes") return { ok: false, erro: "Resposta invalida." };
  const texto = comentario.trim().slice(0, 1000);
  if (resposta === "changes" && texto.length < 3) return { ok: false, erro: "Conte o que precisa mudar." };

  const a = await prisma.quoteArt.findUnique({ where: { token }, select: { id: true, quoteId: true, response: true, quote: { select: { status: true } } } });
  if (!a) return { ok: false, erro: "Link nao encontrado." };
  if (a.quote.status !== "OPEN") return { ok: false, erro: "Esse pedido ja foi entregue ou cancelado." };
  if (a.response) return { ok: false, erro: "Essa arte ja foi respondida." };

  const gravou = await prisma.$transaction(async (tx) => {
    // updateMany com response null garante resposta unica mesmo com clique duplo
    const r = await tx.quoteArt.updateMany({
      where: { id: a.id, response: null },
      data: { response: resposta, responseComment: texto || null, respondedAt: new Date(), seenAt: null },
    });
    if (r.count === 0) return false;
    if (resposta === "approved") {
      await tx.serviceOrder.updateMany({ where: { quoteId: a.quoteId, status: "WAITING" }, data: { status: "PREPRESS" } });
    }
    return true;
  });
  if (!gravou) return { ok: false, erro: "Essa arte ja foi respondida." };
  revalidatePath("/pcp");
  revalidatePath("/vendas");
  return { ok: true };
}
