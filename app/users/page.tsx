import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsersAction } from "../login/actions";
import { UsersClientView } from "./UsersClientView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();

  // If not logged in or not admin, redirect
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-slate-600 mb-4">
          Apenas usuários com perfil <strong>ADMIN</strong> podem gerenciar os usuários e permissões do sistema.
        </p>
        <a href="/" className="text-indigo-600 hover:underline text-sm font-semibold">
          ← Voltar para o Dashboard
        </a>
      </div>
    );
  }

  const users = await getUsersAction();

  return <UsersClientView initialUsers={users} />;
}
