import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";
import type { Role } from "@/lib/roles";

/** Para paginas: sem login vai para o login; papel sem acesso volta para o inicio. */
export async function exigirPapel(papeis: Role[]): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!papeis.includes(s.role)) redirect("/");
  return s;
}

/** Para acoes de servidor: quem chama direto (sem passar pela tela) tambem precisa do papel certo. */
export async function exigirPapelAcao(papeis: Role[]): Promise<SessionUser> {
  const s = await getSession();
  if (!s || !papeis.includes(s.role)) throw new Error("Sem permissao.");
  return s;
}
