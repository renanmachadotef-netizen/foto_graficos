"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Resultado = { ok: true } | { ok: false; erro: string };

async function permitido(): Promise<boolean> {
  const s = await getSession();
  return !!s && ["ADMIN", "MANAGER"].includes(s.role);
}

const NEGADO: Resultado = { ok: false, erro: "Voce nao tem permissao para mexer nas contas." };

function data(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

function diaNoMes(ano: number, mes0: number, dia: number): string {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const d = Math.min(Math.max(dia, 1), ultimo);
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Cria o lancamento do mes atual e do proximo para cada conta fixa ativa (sem duplicar). */
export async function garantirContasFixas() {
  const fixas = await prisma.recurringBill.findMany({ where: { active: true } });
  if (fixas.length === 0) return;
  const hoje = new Date();
  const meses = [0, 1].map((i) => new Date(hoje.getFullYear(), hoje.getMonth() + i, 1));

  for (const m of meses) {
    const inicio = new Date(m.getFullYear(), m.getMonth(), 1, 0, 0, 0);
    const fim = new Date(m.getFullYear(), m.getMonth() + 1, 1, 0, 0, 0);
    const existentes = await prisma.financialTransaction.findMany({
      where: { recurringBillId: { in: fixas.map((f) => f.id) }, dueDate: { gte: inicio, lt: fim } },
      select: { recurringBillId: true },
    });
    const jaTem = new Set(existentes.map((e) => e.recurringBillId));
    const novas = fixas
      .filter((f) => !jaTem.has(f.id))
      .map((f) => ({
        description: f.name,
        supplier: null,
        amount: f.expectedAmount,
        type: "EXPENSE",
        status: "PENDING",
        category: f.category,
        dueDate: data(diaNoMes(m.getFullYear(), m.getMonth(), f.dueDay)),
        recurringBillId: f.id,
        notes: f.notes,
      }));
    if (novas.length) await prisma.financialTransaction.createMany({ data: novas });
  }
}

export interface DadosConta {
  description: string;
  supplier?: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category?: string | null;
  barcode?: string | null;
  notes?: string | null;
}

function limpar(d: DadosConta) {
  return {
    description: d.description.trim().slice(0, 120),
    supplier: d.supplier?.trim() || null,
    amount: Math.abs(Number(d.amount) || 0),
    dueDate: data(d.dueDate),
    category: d.category || null,
    barcode: d.barcode?.replace(/\D/g, "") || null,
    notes: d.notes?.trim() || null,
  };
}

export async function criarConta(d: DadosConta): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  if (!d.description?.trim()) return { ok: false, erro: "Escreva o nome da conta." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) return { ok: false, erro: "Escolha a data de vencimento." };
  await prisma.financialTransaction.create({
    data: { ...limpar(d), type: "EXPENSE", status: "PENDING" },
  });
  revalidatePath("/contas");
  return { ok: true };
}

export async function salvarConta(id: string, d: DadosConta): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  if (!d.description?.trim()) return { ok: false, erro: "Escreva o nome da conta." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) return { ok: false, erro: "Escolha a data de vencimento." };
  await prisma.financialTransaction.update({
    where: { id },
    data: { ...limpar(d), needsReview: false },
  });
  revalidatePath("/contas");
  return { ok: true };
}

export async function pagarConta(
  id: string,
  p: { valor: number; data: string; forma: string },
): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  await prisma.financialTransaction.update({
    where: { id },
    data: {
      status: "PAID",
      paymentDate: data(p.data),
      paymentMethod: p.forma || null,
      amount: Math.abs(Number(p.valor) || 0),
      needsReview: false,
    },
  });
  revalidatePath("/contas");
  revalidatePath("/financial");
  return { ok: true };
}

export async function reabrirConta(id: string): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  await prisma.financialTransaction.update({
    where: { id },
    data: { status: "PENDING", paymentDate: null },
  });
  revalidatePath("/contas");
  revalidatePath("/financial");
  return { ok: true };
}

export async function apagarConta(id: string): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  await prisma.financialTransaction.delete({ where: { id } });
  revalidatePath("/contas");
  return { ok: true };
}

export async function apagarArquivo(fileId: string): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  await prisma.billFile.delete({ where: { id: fileId } });
  revalidatePath("/contas");
  return { ok: true };
}

export interface DadosFixa {
  id?: string;
  name: string;
  dueDay: number;
  expectedAmount: number;
  category?: string | null;
  notes?: string | null;
}

export async function salvarContaFixa(d: DadosFixa): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  if (!d.name?.trim()) return { ok: false, erro: "Escreva o nome da conta fixa." };
  const dia = Math.round(Number(d.dueDay));
  if (!(dia >= 1 && dia <= 31)) return { ok: false, erro: "O dia do vencimento vai de 1 a 31." };
  const dados = {
    name: d.name.trim().slice(0, 80),
    dueDay: dia,
    expectedAmount: Math.abs(Number(d.expectedAmount) || 0),
    category: d.category || null,
    notes: d.notes?.trim() || null,
  };
  if (d.id) await prisma.recurringBill.update({ where: { id: d.id }, data: dados });
  else await prisma.recurringBill.create({ data: dados });
  await garantirContasFixas();
  revalidatePath("/contas");
  return { ok: true };
}

export async function apagarContaFixa(id: string): Promise<Resultado> {
  if (!(await permitido())) return NEGADO;
  // some junto os lancamentos futuros ainda nao pagos; o historico pago fica
  await prisma.financialTransaction.deleteMany({
    where: { recurringBillId: id, status: "PENDING", dueDate: { gte: new Date() } },
  });
  await prisma.recurringBill.delete({ where: { id } });
  revalidatePath("/contas");
  return { ok: true };
}
