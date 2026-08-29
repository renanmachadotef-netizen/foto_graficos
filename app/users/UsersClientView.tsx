"use client";

import { useState } from "react";
import { createUserAction, updateUserStatusAction } from "../login/actions";
import { Role, ROLE_PERMISSIONS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, UserCheck, ShoppingBag, Printer, Plus, UserPlus, CheckCircle2, XCircle } from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

export function UsersClientView({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createUserAction(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setIsOpen(false);
      window.location.reload();
    }
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    await updateUserStatusAction(userId, !currentStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !currentStatus } : u))
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Usuários & Permissões (RBAC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie quem tem acesso ao sistema e quais áreas cada perfil pode visualizar e operar.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Novo Usuário
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo acesso e selecione o nível de permissão adequado.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" name="name" placeholder="Ex: Carlos Silva" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail de Login</Label>
                <Input id="email" name="email" type="email" placeholder="carlos@grafica.com.br" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Perfil de Acesso</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="SELLER"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ADMIN">ADMIN - Administrador (Acesso Total)</option>
                  <option value="MANAGER">MANAGER - Gerente (Gestão & Aprovações)</option>
                  <option value="SELLER">SELLER - Vendedor (Orçamentos & Clientes)</option>
                  <option value="PRODUCTION">PRODUCTION - Operador (PCP & Impressão)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading ? "Criando..." : "Salvar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role explanation cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(["ADMIN", "MANAGER", "SELLER", "PRODUCTION"] as Role[]).map((r) => {
          const info = ROLE_PERMISSIONS[r];
          return (
            <Card key={r} className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{r}</span>
                  <Badge
                    variant={
                      r === "ADMIN" ? "admin" : r === "MANAGER" ? "manager" : r === "SELLER" ? "seller" : "production"
                    }
                    className="text-[9px] uppercase font-bold"
                  >
                    {info.label.split(" ")[0]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-xs text-slate-500 leading-relaxed">{info.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Usuários Cadastrados</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Lista de contas ativas no sistema Foto & Gráficos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="font-semibold text-xs text-slate-600">Usuário</TableHead>
                <TableHead className="font-semibold text-xs text-slate-600">E-mail</TableHead>
                <TableHead className="font-semibold text-xs text-slate-600">Perfil / Nível</TableHead>
                <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                <TableHead className="font-semibold text-xs text-slate-600 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900 text-sm flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === "ADMIN"
                          ? "admin"
                          : u.role === "MANAGER"
                          ? "manager"
                          : u.role === "SELLER"
                          ? "seller"
                          : "production"
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(u.id, u.active)}
                      className={`text-xs ${
                        u.active
                          ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
