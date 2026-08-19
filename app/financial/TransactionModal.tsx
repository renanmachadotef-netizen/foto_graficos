"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFinancialTransaction, updateFinancialTransaction, CreateTransactionInput } from "./actions";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Tag, User, CreditCard, FileText } from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientOption[];
  initialData?: {
    id: string;
    description: string;
    amount: number;
    type: string;
    dueDate: Date | string;
    paymentDate?: Date | string | null;
    status: string;
    category?: string | null;
    paymentMethod?: string | null;
    clientId?: string | null;
    notes?: string | null;
  } | null;
}

const CATEGORIES_INCOME = [
  "Vendas & Serviços",
  "Impressão Digital",
  "Comunicação Visual",
  "Sinalização & Fachadas",
  "Rendimentos / Outros",
];

const CATEGORIES_EXPENSE = [
  "Fornecedores & Insumos",
  "Tintas & Cabeças de Impressão",
  "Lonas, Adesivos & Chapas",
  "Custos Fixos & Estrutura",
  "Aluguel & Condomínio",
  "Energia Elétrica & Água",
  "Folha de Pagamento & Pró-labore",
  "Manutenção de Máquinas",
  "Impostos & Taxas",
  "Outras Despesas",
];

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto Bancário" },
  { value: "CARD_CREDIT", label: "Cartão de Crédito" },
  { value: "CARD_DEBIT", label: "Cartão de Débito" },
  { value: "CASH", label: "Dinheiro / Espécie" },
  { value: "TRANSFER", label: "Transferência / TED" },
  { value: "OTHER", label: "Outro" },
];

export function TransactionModal({ isOpen, onClose, clients, initialData }: TransactionModalProps) {
  const isEditing = !!initialData;
  
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initialData ? (initialData.type as "INCOME" | "EXPENSE") : "INCOME"
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount ? initialData.amount.toString() : "");
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate 
      ? new Date(initialData.dueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState<"PENDING" | "PAID">(
    (initialData?.status as "PENDING" | "PAID") || "PENDING"
  );
  const [paymentDate, setPaymentDate] = useState(
    initialData?.paymentDate
      ? new Date(initialData.paymentDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || "PIX");
  const [clientId, setClientId] = useState(initialData?.clientId || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      alert("Por favor, preencha a descrição e um valor válido.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateTransactionInput = {
        description: description.trim(),
        amount: parseFloat(amount.replace(",", ".")),
        type,
        dueDate,
        status,
        paymentDate: status === "PAID" ? paymentDate : null,
        category: category || (type === "INCOME" ? "Vendas & Serviços" : "Outras Despesas"),
        paymentMethod,
        clientId: clientId || null,
        notes: notes.trim() || undefined,
      };

      if (isEditing && initialData) {
        await updateFinancialTransaction(initialData.id, payload);
      } else {
        await createFinancialTransaction(payload);
      }

      onClose();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      alert("Erro ao salvar lançamento financeiro.");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = type === "INCOME" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
        {/* Header with Type Selector */}
        <div className={`p-6 text-white ${type === "INCOME" ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-rose-600 to-red-600"}`}>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            {type === "INCOME" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {isEditing ? "Editar Lançamento" : (type === "INCOME" ? "Nova Conta a Receber" : "Nova Conta a Pagar")}
          </DialogTitle>
          <p className="text-xs text-white/80 mt-1">
            {type === "INCOME" ? "Registre uma receita ou entrada prevista no caixa." : "Registre uma despesa, custo com fornecedor ou boleto a pagar."}
          </p>

          {!isEditing && (
            <div className="grid grid-cols-2 gap-2 p-1 mt-4 bg-black/20 rounded-xl backdrop-blur-xs">
              <button
                type="button"
                onClick={() => { setType("INCOME"); if (!category) setCategory(CATEGORIES_INCOME[0]); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "INCOME" ? "bg-white text-emerald-700 shadow-sm" : "text-white/80 hover:text-white"
                }`}
              >
                <TrendingUp size={14} /> A Receber (Receita)
              </button>
              <button
                type="button"
                onClick={() => { setType("EXPENSE"); if (!category) setCategory(CATEGORIES_EXPENSE[0]); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "EXPENSE" ? "bg-white text-rose-700 shadow-sm" : "text-white/80 hover:text-white"
                }`}
              >
                <TrendingDown size={14} /> A Pagar (Despesa)
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" /> Descrição do Lançamento *
            </Label>
            <Input
              required
              placeholder={type === "INCOME" ? "Ex: Venda Banner Lona - Supermercado ABC" : "Ex: Compra de Bobina Adesivo 1.60m"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <DollarSign size={14} className="text-slate-400" /> Valor (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 h-10 font-bold text-slate-800 text-base"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" /> Data de Vencimento *
              </Label>
              <Input
                required
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag size={14} className="text-slate-400" /> Categoria
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Selecione uma categoria...</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CreditCard size={14} className="text-slate-400" /> Forma de Pagamento
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" /> Cliente Vinculado (Opcional)
            </Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Nenhum cliente vinculado</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status & Payment Date */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Situação do Pagamento:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("PENDING")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    status === "PENDING"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Pendente
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("PAID")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    status === "PAID"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type === "INCOME" ? "Recebido" : "Pago"}
                </button>
              </div>
            </div>

            {status === "PAID" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-slate-600">
                  Data em que foi efetivado ({type === "INCOME" ? "recebido" : "pago"}):
                </Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Observações / Anotações (Opcional)</Label>
            <Input
              placeholder="Ex: Nota fiscal #4590, parcelamento 1 de 3, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Dialog Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-10">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`h-10 px-6 font-bold text-white shadow-md ${
                type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Salvar Lançamento")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
