"use server";

import { prisma } from "@/lib/prisma";
import {
  ensureDefaultUsers,
  hashPassword,
  setSession,
  clearSession,
  verifyPassword,
  Role,
  getSession,
} from "@/lib/auth";
import { getCurrentTenant, ensureTenantInitialData, TenantId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function loginAction(formData: FormData) {
  const currentTenant = await getCurrentTenant();
  await ensureDefaultUsers();
  await ensureTenantInitialData(currentTenant);

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.active) {
    return { error: "Usuário não encontrado ou inativo nesta empresa." };
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    return { error: "Senha incorreta." };
  }

  // Set active tenant cookie matching user's tenant if user has one
  if (user.tenantId) {
    const cookieStore = await cookies();
    cookieStore.set("active_tenant", user.tenantId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
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
  const currentTenant = await getCurrentTenant();
  await ensureDefaultUsers();
  await ensureTenantInitialData(currentTenant);

  const user = await prisma.user.findFirst({
    where: { role, tenantId: currentTenant, active: true },
  });

  if (!user) {
    // Fallback if tenant user not found
    const anyUser = await prisma.user.findFirst({
      where: { role, active: true },
    });
    if (!anyUser) return { error: "Usuário padrão desse perfil não encontrado." };

    await setSession({
      id: anyUser.id,
      name: anyUser.name,
      email: anyUser.email,
      role: anyUser.role as Role,
      avatar: anyUser.avatar,
    });
    redirect("/");
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

export async function switchTenantAction(tenantId: TenantId) {
  const cookieStore = await cookies();
  cookieStore.set("active_tenant", tenantId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/");
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

  const currentTenant = await getCurrentTenant();
  await ensureDefaultUsers();

  return prisma.user.findMany({
    where: { tenantId: currentTenant },
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

  const currentTenant = await getCurrentTenant();
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
      tenantId: currentTenant,
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
