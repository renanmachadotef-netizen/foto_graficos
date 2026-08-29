"use server";

import { prisma } from "@/lib/prisma";
import { ensureDefaultUsers, hashPassword, setSession, clearSession, verifyPassword, Role, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  await ensureDefaultUsers();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.active) {
    return { error: "Usuário não encontrado ou inativo." };
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    return { error: "Senha incorreta." };
  }

  await setSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatar: user.avatar,
  });

  redirect("/");
}

export async function quickLoginRole(role: Role) {
  await ensureDefaultUsers();

  const user = await prisma.user.findFirst({
    where: { role, active: true },
  });

  if (!user) {
    return { error: "Usuário padrão desse perfil não encontrado." };
  }

  await setSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatar: user.avatar,
  });

  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function getUsersAction() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Acesso não autorizado");
  }

  await ensureDefaultUsers();
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
}

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Apenas administradores podem criar usuários." };
  }

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;

  if (!name || !email || !password || !role) {
    return { error: "Todos os campos são obrigatórios." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe um usuário com este e-mail." };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      role,
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function updateUserStatusAction(userId: string, active: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  revalidatePath("/users");
  return { success: true };
}
