"use client";
import { updateOrderStatus } from "./actions";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useState } from "react";

const COLUMNS = [
  { id: "WAITING", title: "Fila / Arte", color: "bg-slate-200", textColor: "text-slate-800" },
  { id: "PRINTING", title: "Em Produção", color: "bg-blue-200", textColor: "text-blue-800" },
  { id: "FINISHING", title: "Acabamento", color: "bg-amber-200", textColor: "text-amber-800" },
  { id: "READY", title: "Pronto p/ Entrega", color: "bg-green-200", textColor: "text-green-800" }
];

export function KanbanBoard({ orders }: { orders: any[] }) {
  const [movingId, setMovingId] = useState<string | null>(null);

  const handleMove = async (id: string, newStatus: string) => {
    setMovingId(id);
    await updateOrderStatus(id, newStatus);
    setMovingId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[70vh]">
      {COLUMNS.map((col, colIndex) => {
        const colOrders = orders.filter(o => o.status === col.id);
        
        return (
          <div key={col.id} className="flex-1 min-w-[280px] bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className={`p-3 border-b border-slate-200 font-bold ${col.color} ${col.textColor} flex justify-between items-center`}>
              <span>{col.title}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{colOrders.length}</span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {colOrders.map(order => {
                const prevStatus = colIndex > 0 ? COLUMNS[colIndex - 1].id : null;
                const nextStatus = colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1].id : null;
                
                return (
                  <div 
                    key={order.id} 
                    className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 relative ${movingId === order.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-400">#{order.id.slice(-5).toUpperCase()}</span>
                      {order.priority === 'HIGH' && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded">URGENTE</span>}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{order.quote.title}</h4>
                    <p className="text-xs text-slate-500 mb-3">{order.quote.client.name}</p>
                    
                    <div className="flex justify-between mt-4 border-t pt-2">
                      {prevStatus ? (
                        <button 
                          onClick={() => handleMove(order.id, prevStatus)}
                          disabled={movingId === order.id}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        >
                          <ArrowLeft size={16} />
                        </button>
                      ) : <div />}
                      
                      {nextStatus ? (
                        <button 
                          onClick={() => handleMove(order.id, nextStatus)}
                          disabled={movingId === order.id}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        >
                          <ArrowRight size={16} />
                        </button>
                      ) : <div />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
