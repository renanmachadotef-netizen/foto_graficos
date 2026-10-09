import { COMPANY, ensureInitialData } from "@/lib/company";
import { ensureDefaultUsers } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureDefaultUsers();
  await ensureInitialData();

  const company = COMPANY;

  return <LoginForm company={company} />;
}
