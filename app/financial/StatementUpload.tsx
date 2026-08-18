"use client";

import { useState } from "react";
import { uploadTransactions } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";

export function StatementUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("Lendo arquivo...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim() !== "");
        
        const transactions = [];
        // Pula o cabeçalho (i=1) e lê as linhas: Data, Descricao, Valor
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length >= 3) {
            const dateStr = cols[0].trim();
            const desc = cols[1].trim();
            const valStr = cols[2].trim().replace("R$", "").replace("\"", "");
            const amount = parseFloat(valStr);

            if (!isNaN(amount)) {
              transactions.push({
                date: new Date(dateStr), // Formato esperado YYYY-MM-DD
                description: desc,
                amount: Math.abs(amount),
                type: amount < 0 ? "EXPENSE" : "INCOME"
              });
            }
          }
        }

        if (transactions.length > 0) {
          setMessage(`Salvando ${transactions.length} transações...`);
          await uploadTransactions(transactions);
          setMessage("Extrato importado com sucesso!");
        } else {
          setMessage("Nenhuma transação válida encontrada no CSV. Use o formato: Data,Descrição,Valor");
        }
      } catch (err) {
        setMessage("Erro ao processar o arquivo.");
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card className="border-dashed border-2 bg-slate-50">
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <UploadCloud size={48} className="text-slate-400" />
        <div>
          <CardTitle className="text-lg">Upload de Extrato (CSV)</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Formato suportado: Data, Descrição, Valor</p>
        </div>
        <div className="relative">
          <Input 
            type="file" 
            accept=".csv" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            disabled={loading}
          />
          <Button variant="outline" className="pointer-events-none" disabled={loading}>
            {loading ? "Processando..." : "Selecionar Arquivo CSV"}
          </Button>
        </div>
        {message && <p className="text-sm font-semibold text-blue-600">{message}</p>}
      </CardContent>
    </Card>
  );
}
