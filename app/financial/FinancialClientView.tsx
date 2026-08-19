"use client";

import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  RotateCcw,
  UploadCloud,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionModal } from "./TransactionModal";
import { SettleModal } from "./SettleModal";
import { StatementUpload } from "./StatementUpload";
import { FixedCostsCard } from "./FixedCostsCard";
import { deleteTransaction, reopenFinancialTransaction } from "./actions";

export interface TransactionItem {
  id: string;
  date: Date | string;
  dueDate: Date | string;
  paymentDate?: Date | string | null;
  description: string;
  amount: number;
  type: string; // "INCOME" | "EXPENSE"
  status: string; // "PENDING" | "PAID" | "CANCELLED"
  category?: string | null;
  paymentMethod?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  quoteId?: string | null;
  notes?: string | null;
}

interface FinancialClientViewProps {
  transactions: TransactionItem[];
  clients: { id: string; name: string }[];
  fixedCosts: any[];
}

export function FinancialClientView({ transactions, clients, fixedCosts }: FinancialClientViewProps) {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<"ALL" | "RECEIVABLE" | "PAYABLE" | "FIXED_COSTS" | "EXTRACT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "OVERDUE" | "PAID">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL"); // "YYYY-MM" or "ALL"

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [settlingTransaction, setSettlingTransaction] = useState<TransactionItem | null>(null);

  // Helper date parsing (avoid timezone drift)
  const parseSafeDate = (d: Date | string | null | undefined) => {
    if (!d) return null;
    if (typeof d === "string") {
      const parts = d.split("T")[0].split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date(d);
  };

  const isOverdue = (t: TransactionItem) => {
    if (t.status !== "PENDING") return false;
    const due = parseSafeDate(t.dueDate);
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getDaysDiff = (targetDate: Date | string) => {
    const d = parseSafeDate(targetDate);
    if (!d) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalReceivablePending = 0;
    let overdueReceivableCount = 0;
    let totalPayablePending = 0;
    let overduePayableCount = 0;

    let totalPaidIncome = 0;
    let totalPaidExpense = 0;

    transactions.forEach((t) => {
      if (t.status === "CANCELLED") return;

      if (t.type === "INCOME") {
        if (t.status === "PAID") {
          totalPaidIncome += t.amount;
        } else if (t.status === "PENDING") {
          totalReceivablePending += t.amount;
          if (isOverdue(t)) overdueReceivableCount++;
        }
      } else if (t.type === "EXPENSE") {
        if (t.status === "PAID") {
          totalPaidExpense += t.amount;
        } else if (t.status === "PENDING") {
          totalPayablePending += t.amount;
          if (isOverdue(t)) overduePayableCount++;
        }
      }
    });

    const realizedBalance = totalPaidIncome - totalPaidExpense;
    const projectedBalance = realizedBalance + totalReceivablePending - totalPayablePending;

    return {
      totalReceivablePending,
      overdueReceivableCount,
      totalPayablePending,
      overduePayableCount,
      totalPaidIncome,
      totalPaidExpense,
      realizedBalance,
      projectedBalance,
    };
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Tab filter
      if (activeTab === "RECEIVABLE" && t.type !== "INCOME") return false;
      if (activeTab === "PAYABLE" && t.type !== "EXPENSE") return false;

      // Status filter
      if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
      if (statusFilter === "PAID" && t.status !== "PAID") return false;
      if (statusFilter === "OVERDUE" && !isOverdue(t)) return false;

      // Month filter
      if (selectedMonth !== "ALL") {
        const d = parseSafeDate(t.dueDate);
        if (d) {
          const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (mStr !== selectedMonth) return false;
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(q);
        const clientMatch = t.client?.name.toLowerCase().includes(q);
        const catMatch = t.category?.toLowerCase().includes(q);
        const amountMatch = t.amount.toFixed(2).includes(q);
        if (!descMatch && !clientMatch && !catMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [transactions, activeTab, statusFilter, selectedMonth, searchQuery]);

  // Unique months available in data for filter
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach((t) => {
      const d = parseSafeDate(t.dueDate);
      if (d) {
        monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [transactions]);

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lançamento financeiro?")) {
      await deleteTransaction(id);
    }
  };

  const handleReopen = async (id: string) => {
    if (confirm("Deseja reabrir este lançamento para o status Pendente?")) {
      await reopenFinancialTransaction(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            Financeiro & Fluxo de Caixa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestão de contas a pagar, a receber, fluxo de caixa e ponto de equilíbrio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setIsNewModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm flex items-center gap-1.5 h-10 px-4 rounded-xl"
          >
            <Plus size={18} /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPI DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber */}
        <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
              <span>Total a Receber</span>
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <ArrowUpRight size={16} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">
              R$ {kpis.totalReceivablePending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              {kpis.overdueReceivableCount > 0 ? (
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  <AlertCircle size={13} /> {kpis.overdueReceivableCount} em atraso
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 size={13} /> Nenhum atraso
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total a Pagar */}
        <Card className="border border-rose-100 bg-gradient-to-br from-rose-50 to-white shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
              <span>Total a Pagar</span>
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <ArrowDownRight size={16} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              R$ {kpis.totalPayablePending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              {kpis.overduePayableCount > 0 ? (
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  <AlertCircle size={13} /> {kpis.overduePayableCount} contas vencidas
                </span>
              ) : (
                <span className="text-slate-500 font-medium">Contas operacionais em dia</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saldo Realizado (Caixa) */}
        <Card className="border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center justify-between">
              <span>Saldo Realizado</span>
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <DollarSign size={16} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${kpis.realizedBalance >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              R$ {kpis.realizedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex justify-between">
              <span className="text-emerald-700 font-medium">Entradas: R$ {kpis.totalPaidIncome.toFixed(0)}</span>
              <span className="text-rose-600 font-medium">Saídas: R$ {kpis.totalPaidExpense.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Saldo Projetado */}
        <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
              <span>Saldo Projetado</span>
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <ShieldCheck size={16} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${kpis.projectedBalance >= 0 ? "text-indigo-900" : "text-rose-600"}`}>
              R$ {kpis.projectedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              <span>Considerando todos os pendentes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "ALL"
              ? "border-slate-800 text-slate-800"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={16} /> Todos os Lançamentos ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab("RECEIVABLE")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "RECEIVABLE"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp size={16} className="text-emerald-600" /> Contas a Receber
        </button>

        <button
          onClick={() => setActiveTab("PAYABLE")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "PAYABLE"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingDown size={16} className="text-rose-600" /> Contas a Pagar
        </button>

        <button
          onClick={() => setActiveTab("FIXED_COSTS")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "FIXED_COSTS"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck size={16} /> Ponto de Equilíbrio & Custos Fixos
        </button>

        <button
          onClick={() => setActiveTab("EXTRACT")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "EXTRACT"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileSpreadsheet size={16} /> Upload de Extrato (CSV)
        </button>
      </div>

      {/* VIEW CONTENT BASED ON TAB */}
      {activeTab === "FIXED_COSTS" && (
        <div className="max-w-2xl">
          <FixedCostsCard fixedCosts={fixedCosts} />
        </div>
      )}

      {activeTab === "EXTRACT" && (
        <div className="max-w-xl">
          <StatementUpload />
        </div>
      )}

      {(activeTab === "ALL" || activeTab === "RECEIVABLE" || activeTab === "PAYABLE") && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400 size-4" />
              <Input
                placeholder="Buscar descrição, cliente ou valor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              {/* Status Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "PENDING" ? "bg-amber-500 text-white shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setStatusFilter("OVERDUE")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "OVERDUE" ? "bg-rose-600 text-white shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Atrasados
                </button>
                <button
                  onClick={() => setStatusFilter("PAID")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "PAID" ? "bg-emerald-600 text-white shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Pagos / Recebidos
                </button>
              </div>

              {/* Month Selector */}
              {availableMonths.length > 0 && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">Todos os Meses</option>
                  {availableMonths.map((m) => {
                    const [year, month] = m.split("-");
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const label = dateObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                    return (
                      <option key={m} value={m}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Tipo / Descrição</th>
                    <th className="p-4">Categoria & Meio</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Clock size={36} className="text-slate-300" />
                          <p className="font-medium text-slate-600">Nenhum lançamento encontrado.</p>
                          <p className="text-xs text-slate-400">Tente ajustar os filtros ou crie um novo lançamento.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredTransactions.map((t) => {
                    const isInc = t.type === "INCOME";
                    const overdue = isOverdue(t);
                    const dueObj = parseSafeDate(t.dueDate);
                    const paymentObj = parseSafeDate(t.paymentDate);
                    const daysDiff = getDaysDiff(t.dueDate);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Tipo / Descrição */}
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isInc ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {isInc ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 leading-snug">
                                {t.description}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                                {t.client && (
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                    Cliente: {t.client.name}
                                  </span>
                                )}
                                {t.quoteId && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                                    Orç. #{t.quoteId.slice(-5).toUpperCase()}
                                  </span>
                                )}
                                {t.notes && (
                                  <span className="text-slate-400 italic">
                                    • {t.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Categoria & Meio */}
                        <td className="p-4 text-xs">
                          <div className="font-semibold text-slate-700">
                            {t.category || (isInc ? "Vendas" : "Geral")}
                          </div>
                          {t.paymentMethod && (
                            <div className="text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>{t.paymentMethod}</span>
                            </div>
                          )}
                        </td>

                        {/* Vencimento */}
                        <td className="p-4 text-xs whitespace-nowrap">
                          <div className="font-bold text-slate-700">
                            {dueObj ? dueObj.toLocaleDateString("pt-BR") : "-"}
                          </div>
                          {t.status === "PENDING" && (
                            <div className="mt-0.5">
                              {overdue ? (
                                <span className="text-rose-600 font-bold">
                                  Vencido há {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? "dia" : "dias"}
                                </span>
                              ) : daysDiff === 0 ? (
                                <span className="text-amber-600 font-bold">Vence hoje</span>
                              ) : (
                                <span className="text-slate-400">
                                  Em {daysDiff} {daysDiff === 1 ? "dia" : "dias"}
                                </span>
                              )}
                            </div>
                          )}
                          {t.status === "PAID" && paymentObj && (
                            <div className="text-emerald-600 font-medium mt-0.5">
                              Pago em: {paymentObj.toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center whitespace-nowrap">
                          {t.status === "PAID" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} /> {isInc ? "Recebido" : "Pago"}
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle size={12} /> Atrasado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </td>

                        {/* Valor */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className={`text-base font-black ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                            {isInc ? "+" : "-"} R$ {t.amount.toFixed(2)}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Settle Action Button */}
                            {t.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => setSettlingTransaction(t)}
                                className={`h-8 px-2.5 text-xs font-bold text-white shadow-xs rounded-lg ${
                                  isInc ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                                title={isInc ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                              >
                                <CheckCircle2 size={14} className="mr-1" /> Dar Baixa
                              </Button>
                            )}

                            {/* Reopen Action Button */}
                            {t.status === "PAID" && (
                              <button
                                onClick={() => handleReopen(t.id)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Reabrir / Marcar como Pendente"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}

                            {/* Edit Action */}
                            <button
                              onClick={() => {
                                setEditingTransaction(t);
                                setIsNewModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Lançamento"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete Action */}
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isNewModalOpen && (
        <TransactionModal
          isOpen={isNewModalOpen}
          onClose={() => {
            setIsNewModalOpen(false);
            setEditingTransaction(null);
          }}
          clients={clients}
          initialData={editingTransaction}
        />
      )}

      {settlingTransaction && (
        <SettleModal
          isOpen={!!settlingTransaction}
          onClose={() => setSettlingTransaction(null)}
          transaction={settlingTransaction}
        />
      )}
    </div>
  );
}
