import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Role, SessionUser } from "./roles";

export * from "./roles";

const SESSION_COOKIE_NAME = "foto_graficos_session";
const SECRET_KEY = process.env.SESSION_SECRET || "foto-graficos-super-secret-key-2026-saas-erp";

// Password Hashing with Salt using Node crypto
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(hashToVerify, "hex"));
  } catch {
    return false;
  }
}

// Token signing
function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyToken<T>(token: string): T | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSig = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as T;
  } catch {
    return null;
  }
}

// Session Helpers
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken<SessionUser>(token);
}

export async function setSession(user: SessionUser) {
  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Seed / Ensure Default Demo Users (Race-condition proof with upsert)
export async function ensureDefaultUsers() {
  try {
    const defaultUsers = [
      {
        name: "Renan (Admin)",
        email: "admin@fotograficos.com.br",
        password: hashPassword("admin123"),
        role: "ADMIN" as Role,
      },
      {
        name: "Gerente Operacional",
        email: "gerente@fotograficos.com.br",
        password: hashPassword("gerente123"),
        role: "MANAGER" as Role,
      },
      {
        name: "Vendedor Comercial",
        email: "vendedor@fotograficos.com.br",
        password: hashPassword("vendedor123"),
        role: "SELLER" as Role,
      },
      {
        name: "Operador de Impressão",
        email: "producao@fotograficos.com.br",
        password: hashPassword("producao123"),
        role: "PRODUCTION" as Role,
      },
    ];

    for (const u of defaultUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: u,
      });
    }
  } catch {
    // Ignore concurrency conflicts during Next.js multi-worker static builds
  }
}
