import { ClientForm } from "./ClientForm";
import { Trash2 } from "lucide-react";
import { deleteClient } from "./actions";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant, ensureTenantInitialData } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const tenantId = await getCurrentTenant();
  await ensureTenantInitialData(tenantId);

  const clients = await prisma.client.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Clientes (CRM)</h1>
        <p className="text-muted-foreground">Cadastre seus clientes para gerar propostas, vendas e ordens de serviço.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ClientForm />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-700">Carteira de Clientes</h2>
          
          {clients.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">Nenhum cliente cadastrado nesta empresa ainda.</p>
            </div>
          )}
          
          <div className="grid gap-3">
            {clients.map(client => (
              <div key={client.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{client.name}</h3>
                  <div className="text-sm text-slate-500 flex gap-4 mt-1">
                    {client.document && <p>Doc: <strong className="text-slate-700">{client.document}</strong></p>}
                    {client.phone && <p>Tel: <strong className="text-slate-700">{client.phone}</strong></p>}
                  </div>
                  {client.email && <p className="text-sm text-slate-500 mt-1">{client.email}</p>}
                </div>
                
                <div className="text-right border-l pl-4 ml-4">
                  <form action={async () => { "use server"; await deleteClient(client.id); }}>
                    <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 cursor-pointer">
                      <Trash2 size={20}/>
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
