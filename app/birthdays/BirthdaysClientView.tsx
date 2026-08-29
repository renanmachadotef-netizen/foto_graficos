"use client";

import React, { useState, useMemo } from "react";
import {
  Cake,
  Gift,
  Trophy,
  Search,
  Sparkles,
  Phone,
  MessageCircle,
  Calendar,
  PartyPopper,
  Users,
  ChevronRight,
  RefreshCw,
  Award,
  Flame,
  CheckCircle2,
  Share2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TenantConfig } from "@/lib/tenant";
import { drawBirthdayWinnerAction } from "./actions";
import { importLegacyClientsAction } from "@/app/clients/actions";

interface ClientBirthday {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  document?: string | null;
  address?: string | null;
  status: string;
}

interface BirthdaysClientViewProps {
  clientsWithBirthday: ClientBirthday[];
  totalClients: number;
  currentMonth: number;
  currentDay: number;
  tenantConfig: TenantConfig;
}

const MONTHS = [
  { id: 1, name: "Janeiro", short: "Jan", icon: "❄️" },
  { id: 2, name: "Fevereiro", short: "Fev", icon: "🎭" },
  { id: 3, name: "Março", short: "Mar", icon: "🌱" },
  { id: 4, name: "Abril", short: "Abr", icon: "🐰" },
  { id: 5, name: "Maio", short: "Mai", icon: "🌸" },
  { id: 6, name: "Junho", short: "Jun", icon: "🌽" },
  { id: 7, name: "Julho", short: "Jul", icon: "🏖️" },
  { id: 8, name: "Agosto", short: "Ago", icon: "☀️" },
  { id: 9, name: "Setembro", short: "Set", icon: "🍂" },
  { id: 10, name: "Outubro", short: "Out", icon: "🎃" },
  { id: 11, name: "Novembro", short: "Nov", icon: "🍁" },
  { id: 12, name: "Dezembro", short: "Dez", icon: "🎄" },
];

export function BirthdaysClientView({
  clientsWithBirthday,
  totalClients,
  currentMonth,
  currentDay,
  tenantConfig,
}: BirthdaysClientViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Raffle State
  const [isRaffleOpen, setIsRaffleOpen] = useState(false);
  const [rafflePrize, setRafflePrize] = useState<string>(
    tenantConfig.id === "PURABRASIL" ? "1 Garrafa Cachaça Carvalho Premium 750ml" : "1 Banner Fotográfico Personalizado 1x1m"
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplayCandidate, setCurrentDisplayCandidate] = useState<string>("");
  const [raffleWinner, setRaffleWinner] = useState<any | null>(null);

  // Group clients by month
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) counts[i] = 0;
    clientsWithBirthday.forEach((c) => {
      if (c.birthMonth) counts[c.birthMonth] = (counts[c.birthMonth] || 0) + 1;
    });
    return counts;
  }, [clientsWithBirthday]);

  // Clients in selected month
  const monthClients = useMemo(() => {
    return clientsWithBirthday.filter((c) => c.birthMonth === selectedMonth);
  }, [clientsWithBirthday, selectedMonth]);

  // Filtered by search
  const filteredClients = useMemo(() => {
    return monthClients.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      return matchSearch;
    });
  }, [monthClients, searchQuery]);

  // Today's Birthdays
  const todaysBirthdays = useMemo(() => {
    return clientsWithBirthday.filter(
      (c) => c.birthMonth === currentMonth && c.birthDay === currentDay
    );
  }, [clientsWithBirthday, currentMonth, currentDay]);

  // Sound chime using Web Audio API
  const playVictorySound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.12);
        osc.stop(audioCtx.currentTime + i * 0.12 + 0.6);
      });
    } catch (e) {
      console.log("Audio not allowed without gesture", e);
    }
  };

  // Run the animated Raffle
  const handleStartRaffle = async () => {
    if (monthClients.length === 0) return;

    setIsSpinning(true);
    setRaffleWinner(null);

    // Call server action to pick the actual winner
    const result = await drawBirthdayWinnerAction(selectedMonth, rafflePrize);
    if (result.error || !result.winner) {
      alert(result.error || "Erro no sorteio");
      setIsSpinning(false);
      return;
    }

    // Animation: cycle rapidly through names for 3.5 seconds
    let iteration = 0;
    const maxIterations = 35;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * monthClients.length);
      setCurrentDisplayCandidate(monthClients[randomIdx].name);
      iteration++;

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setCurrentDisplayCandidate(result.winner.name);
        setRaffleWinner(result);
        setIsSpinning(false);
        playVictorySound();
      }
    }, 90);
  };

  const getWhatsAppGreetingUrl = (client: ClientBirthday) => {
    if (!client.phone) return null;
    const cleanPhone = client.phone.replace(/\D/g, "");
    if (!cleanPhone) return null;

    const companyName = tenantConfig.name;
    const isPB = tenantConfig.id === "PURABRASIL";
    const greetingText = `Olá *${client.name.trim()}*, tudo bem? 🎉🎂\n\nA equipe da *${companyName}* está passando para te desejar um *Feliz Aniversário*! Que o seu novo ano de vida seja repleto de muitas alegrias, saúde e sucesso!\n\n${
      isPB
        ? "Venha brindar conosco! Preparamos um presente especial para celebrar o seu dia no nosso alambique! 🥃✨"
        : "Como nosso cliente especial, venha nos visitar para retirar um brinde comemorativo e um desconto especial no seu próximo pedido! 🎁🖨️"
    }\n\nAbraços de toda a nossa equipe!`;

    return `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(greetingText)}`;
  };

  const calculateAge = (birthDate?: Date | null) => {
    if (!birthDate) return null;
    try {
      const birth = new Date(birthDate);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      if (age > 0 && age < 120) return `${age} anos`;
    } catch {
      return null;
    }
    return null;
  };

  const isPuraBrasil = tenantConfig.id === "PURABRASIL";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          isPuraBrasil
            ? "bg-gradient-to-r from-amber-800 via-amber-700 to-yellow-800"
            : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600"
        }`}
      >
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
            <PartyPopper className="w-4 h-4 text-yellow-300" />
            Central de Relacionamento & Fidelização
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            <Cake className="w-8 h-8 text-yellow-300 animate-bounce" />
            Aniversariantes do Mês
          </h1>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Acompanhe as datas especiais dos seus clientes, envie parabéns instantâneo pelo WhatsApp e faça sorteios de prêmios mensais para encantar e fidelizar!
          </p>
        </div>

        {/* Action button for Raffle */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              setRaffleWinner(null);
              setIsRaffleOpen(true);
            }}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-xl shadow-yellow-500/30 gap-2 text-base px-6 py-6 rounded-xl transform hover:scale-105 transition-all cursor-pointer"
          >
            <Trophy className="w-6 h-6 text-amber-700" />
            Sortear Prêmio do Mês
          </Button>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none text-9xl">
          🎂
        </div>
      </div>

      {/* Today's Birthdays Highlight if any */}
      {todaysBirthdays.length > 0 && (
        <Card className="border-2 border-yellow-400/80 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
              🎉 Aniversariantes de Hoje ({todaysBirthdays.length})
            </CardTitle>
            <CardDescription className="text-amber-800 text-xs">
              Não se esqueça de mandar uma mensagem especial hoje mesmo!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {todaysBirthdays.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-3.5 rounded-xl border border-yellow-300/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone || "Sem telefone"}</p>
                  </div>
                  {c.phone && (
                    <a
                      href={getWhatsAppGreetingUrl(c) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Parabéns
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Navigation Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Selecione o Mês
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Total na base: <strong>{clientsWithBirthday.length}</strong> de {totalClients} clientes com aniversário
          </span>
        </div>

        {/* 12 Months Horizontal Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MONTHS.map((m) => {
            const isSelected = selectedMonth === m.id;
            const isThisMonth = currentMonth === m.id;
            const count = monthCounts[m.id] || 0;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMonth(m.id)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? isPuraBrasil
                      ? "bg-amber-800 text-white border-amber-900 shadow-md shadow-amber-800/20"
                      : "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-base">{m.icon}</span>
                  {isThisMonth && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                        isSelected ? "bg-white text-indigo-700" : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      Atual
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-bold text-sm leading-tight">{m.name}</p>
                  <p className={`text-xs mt-0.5 font-medium ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                    {count} aniversariante{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Section */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>{MONTHS.find((m) => m.id === selectedMonth)?.icon}</span>
              Aniversariantes de {MONTHS.find((m) => m.id === selectedMonth)?.name} ({filteredClients.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Lista ordenada por dia do mês para facilitar seu planejamento de contatos e mimos.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Cake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">Nenhum aniversariante encontrado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? "Nenhum resultado corresponde aos termos da busca."
                  : `Não há clientes cadastrados com data de aniversário no mês de ${
                      MONTHS.find((m) => m.id === selectedMonth)?.name
                    }.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const isToday = client.birthMonth === currentMonth && client.birthDay === currentDay;
                const age = calculateAge(client.birthDate);
                const whatsappUrl = getWhatsAppGreetingUrl(client);

                return (
                  <div
                    key={client.id}
                    className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isToday ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Day Badge */}
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs ${
                          isToday
                            ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-400/30 ring-2 ring-amber-400"
                            : isPuraBrasil
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-tighter">DIA</span>
                        <span className="text-lg leading-none">{client.birthDay}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                          {isToday && (
                            <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                              Hoje! 🎂
                            </Badge>
                          )}
                          {client.code && (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              Cód #{client.code}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {client.phone}
                            </span>
                          )}
                          {age && (
                            <span className="text-slate-600 font-medium">
                              • Completa <strong>{age}</strong>
                            </span>
                          )}
                          {client.document && (
                            <span className="text-slate-600">
                              • CPF: {client.document}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick WhatsApp Action */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Dar Parabéns no WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem telefone cadastrado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAFFLE DIALOG / MODAL */}
      <Dialog open={isRaffleOpen} onOpenChange={setIsRaffleOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-2 border-yellow-400/80 rounded-2xl bg-slate-950 text-white">
          <div className="p-6 text-center bg-gradient-to-b from-amber-600/30 to-slate-950 border-b border-yellow-500/20">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-yellow-500/30 animate-pulse">
              <Trophy className="w-9 h-9 text-slate-950" />
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">
              Sorteio de Aniversariantes do Mês
            </DialogTitle>
            <DialogDescription className="text-yellow-200/80 text-xs mt-1">
              Concorrem todos os <strong>{monthClients.length} aniversariantes</strong> de{" "}
              <strong>{MONTHS.find((m) => m.id === selectedMonth)?.name}</strong>!
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5">
            {/* Prize Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Prêmio a ser Sorteado
              </label>
              <Input
                value={rafflePrize}
                onChange={(e) => setRafflePrize(e.target.value)}
                placeholder="Ex: 1 Banner 1x1m, 1 Ensaio Fotográfico, 1 Caixa de Cachaça..."
                disabled={isSpinning}
                className="bg-slate-900/90 border-slate-700 text-white text-sm focus:border-yellow-400"
              />
            </div>

            {/* Live Roulette Display */}
            <div className="relative py-8 px-4 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-yellow-500/40 text-center shadow-inner overflow-hidden">
              <div className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                {isSpinning ? "Girando a Roleta..." : raffleWinner ? "🎉 GANHADOR(A) SORTEADO(A) 🎉" : "Candidato"}
              </div>

              <div
                className={`text-xl sm:text-2xl font-black tracking-tight transition-all duration-75 ${
                  raffleWinner
                    ? "text-yellow-300 scale-105"
                    : isSpinning
                    ? "text-white animate-pulse"
                    : "text-slate-400"
                }`}
              >
                {currentDisplayCandidate || (monthClients[0]?.name ?? "Nenhum participante")}
              </div>

              {raffleWinner && (
                <div className="mt-4 pt-4 border-t border-yellow-500/20 space-y-2">
                  <p className="text-xs text-yellow-100">
                    🎂 Aniversário: <strong>Dia {raffleWinner.winner.birthDay} de {MONTHS.find((m) => m.id === selectedMonth)?.name}</strong>
                  </p>
                  {raffleWinner.winner.phone && (
                    <p className="text-xs text-slate-300">
                      📱 WhatsApp: <strong>{raffleWinner.winner.phone}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!raffleWinner ? (
                <Button
                  onClick={handleStartRaffle}
                  disabled={isSpinning || monthClients.length === 0}
                  className="w-full py-6 text-base font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-xl shadow-yellow-500/25 rounded-xl cursor-pointer"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Sorteando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Girar Roleta do Sorteio!
                    </span>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  {raffleWinner.whatsappUrl ? (
                    <a
                      href={raffleWinner.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/30"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Notificar Ganhador no WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-center text-yellow-300">
                      O ganhador não possui telefone cadastrado. Entre em contato pessoalmente!
                    </p>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleStartRaffle}
                    disabled={isSpinning}
                    className="w-full border-slate-700 hover:bg-slate-900 text-slate-300 text-xs py-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Sortear Novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
