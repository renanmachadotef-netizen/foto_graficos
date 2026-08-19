import { PrismaClient } from "@prisma/client";
import { MaterialForm } from "./MaterialForm";
import { Trash2, Maximize2 } from "lucide-react";
import { deleteMaterial } from "./actions";
import { EditMaterialDialog } from "./EditMaterialDialog";

const prisma = new PrismaClient();

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Insumos & Materiais</h1>
        <p className="text-muted-foreground">Gestão de chapas, rolos de mídias e custos de insumos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <MaterialForm />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-700">Materiais Registrados</h2>
          
          {materials.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">Nenhum material cadastrado ainda.</p>
            </div>
          )}
          
          <div className="grid gap-3">
            {materials.map(mat => (
              <div key={mat.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full">
                  <h3 className="font-bold text-slate-800 text-lg">{mat.name}</h3>
                  
                  <div className="mt-2 flex gap-4 text-sm text-slate-600">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Custo</p>
                      <p className="font-semibold text-slate-700">R$ {mat.unitCost.toFixed(2)} / {mat.unit}</p>
                    </div>
                    
                    {mat.width && (
                      <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700">
                        <Maximize2 size={14} />
                        <span className="font-semibold">{mat.width}m de largura</span>
                      </div>
                    )}
                    
                    {mat.wasteMargin > 0 && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-amber-500/80">Perda (Refugo)</p>
                        <p className="font-semibold text-slate-700">{mat.wasteMargin}%</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-l pl-4 ml-4 flex items-center">
                  <EditMaterialDialog material={mat} />
                  <form action={async () => { "use server"; await deleteMaterial(mat.id); }}>
                    <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50">
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
