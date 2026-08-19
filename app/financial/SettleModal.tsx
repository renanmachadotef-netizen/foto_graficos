"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settleFinancialTransaction } from "./actions";
import { CheckCircle2, DollarSign, Calendar, CreditCard } from "lucide-react";

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: string;
    dueDate: Date | string;
    paymentMethod?: string | null;
    client?: { name: string } | null;
  } | null;
}

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto Bancário" },
  { value: "CARD_CREDIT", label: "Cartão de Crédito" },
  { value: "CARD_DEBIT", label: "Cartão de Débito" },
  { value: "CASH", label: "Dinheiro / Espécie" },
  { value: "TRANSFER", label: "Transferência / TED" },
  { value: "OTHER", label: "Outro" },
];

export function SettleModal({ isOpen, onClose, transaction }: SettleModalProps) {
  if (!transaction) return null;

  const isIncome = transaction.type === "INCOME";
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || "PIX");
  const [loading, setLoading] = useState(false);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settleFinancialTransaction(transaction.id, paymentDate, paymentMethod);
      onClose();
    } catch (err) {
      console.error("Erro ao dar baixa:", err);
      alert("Erro ao confirmar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className={`p-6 text-white ${isIncome ? "bg-emerald-600" : "bg-blue-600"}`}>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            {isIncome ? "Confirmar Recebimento" : "Confirmar Pagamento"}
          </DialogTitle>
          <p className="text-xs text-white/80 mt-1">
            {isIncome 
              ? "Dar baixa no título e registrar a entrada deste valor no caixa." 
              : "Registrar que esta conta foi paga e debitada do caixa."}
          </p>
        </div>

        <form onSubmit={handleSettle} className="p-6 space-y-4">
          {/* Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isIncome ? "Título a Receber" : "Título a Pagar"}
            </div>
            <div className="text-base font-bold text-slate-800">
              {transaction.description}
            </div>
            {transaction.client && (
              <div className="text-xs text-slate-600">
                Cliente: <span className="font-semibold text-slate-800">{transaction.client.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500">Valor Total:</span>
              <span className={`text-xl font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                R$ {transaction.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" /> Data da Efetivação / Pagamento *
            </Label>
            <Input
              required
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CreditCard size={14} className="text-slate-400" /> Forma de Pagamento Utilizada
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-10">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`h-10 px-6 font-bold text-white shadow-md ${
                isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Confirmando..." : (isIncome ? "Confirmar Recebimento" : "Confirmar Pagamento")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
