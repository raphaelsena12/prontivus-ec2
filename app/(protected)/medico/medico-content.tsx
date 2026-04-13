"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Clock, User, Calendar, ChevronRight, Play,
  Stethoscope, CheckCircle2, Timer, Users,
} from "lucide-react";
import { toast } from "sonner";
import { PagamentosCards } from "@/components/pagamentos-cards";
import { DateFilterBadges } from "@/components/date-filter-badges";
import { DateFilter } from "@/lib/timezone-utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

interface MedicoContentProps {
  nome: string;
}

interface Estatisticas {
  totalPagamentos: number;
  pagamentosPendentes: number;
  pagamentosPagos: number;
  pagamentosVencidos: number;
  receitaMesAtual: number;
  receitaTotal: number;
  receitaParticular: number;
  receitaConvenios: number;
  retornos: number;
}

interface ChartData {
  receitaComparativa: { label: string; particular: number; convenio: number }[];
  receitaPorConvenio: { operadora: string; total: number }[];
}

interface Agendamento {
  id: string;
  dataHora: string;
  status: string;
  paciente: { nome: string; id: string };
  operadora: { nomeFantasia: string; razaoSocial: string } | null;
  tipoConsulta: { nome: string } | null;
}

interface AgendaData {
  proximoAtendimento: Agendamento | null;
  agendamentosHoje: Agendamento[];
}

const receitaComparativaConfig: ChartConfig = {
  particular: { label: "Particular", color: "#334155" },
  convenio: { label: "Convênio", color: "#10b981" },
};

const receitaConvenioConfig: ChartConfig = {
  total: { label: "Receita", color: "#38bdf8" },
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-sky-600",
];

const AVATAR_SHADOWS = [
  "shadow-violet-500/30",
  "shadow-blue-500/30",
  "shadow-emerald-500/30",
  "shadow-rose-500/30",
  "shadow-amber-500/30",
  "shadow-cyan-500/30",
];

function getInitials(nome: string): string {
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarStyle(nome: string) {
  const idx = (nome.charCodeAt(0) + (nome.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length;
  return { gradient: AVATAR_GRADIENTS[idx], shadow: AVATAR_SHADOWS[idx] };
}

export function MedicoContent({ nome }: MedicoContentProps) {
  const router = useRouter();
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("diario");

  const fetchChartsAndStats = (filter: DateFilter) => {
    setLoading(true);
    setLoadingCharts(true);

    fetch(`/api/medico/dashboard/estatisticas?filter=${filter}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setEstatisticas)
      .catch((e) => console.error("Erro estatísticas:", e))
      .finally(() => setLoading(false));

    fetch(`/api/medico/dashboard/charts?filter=${filter}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => setChartData({
        receitaComparativa: json.receitaComparativa ?? [],
        receitaPorConvenio: json.receitaPorConvenio ?? [],
      }))
      .catch((e) => console.error("Erro charts:", e))
      .finally(() => setLoadingCharts(false));
  };

  const fetchAgenda = () => {
    setLoadingAgenda(true);
    fetch("/api/medico/dashboard/agenda-hoje")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => setAgendaData({
        proximoAtendimento: json.proximoAtendimento ?? null,
        agendamentosHoje: json.agendamentosHoje ?? [],
      }))
      .catch((e) => console.error("Erro agenda:", e))
      .finally(() => setLoadingAgenda(false));
  };

  useEffect(() => {
    fetchChartsAndStats(dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    fetchAgenda();
  }, []);

  const handleIniciarAtendimento = async (consultaId: string) => {
    try {
      const response = await fetch("/api/medico/fila-atendimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultaId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao iniciar atendimento");
      }
      toast.success("Atendimento iniciado com sucesso");
      router.push(`/medico/atendimento?consultaId=${consultaId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar atendimento");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; dot: string; pulse: boolean }> = {
      CONFIRMADA:     { label: "Aguardando",     cls: "bg-amber-50 text-amber-700 border border-amber-200",   dot: "bg-amber-400",  pulse: false },
      EM_ATENDIMENTO: { label: "Em Atendimento", cls: "bg-blue-50 text-blue-700 border border-blue-200",      dot: "bg-blue-500",   pulse: true  },
      REALIZADA:      { label: "Realizado",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", pulse: false },
    };
    const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400", pulse: false };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
        {s.label}
      </span>
    );
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const hojeCap = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  const confirmados = agendaData?.agendamentosHoje.filter((a) => a.status === "CONFIRMADA") ?? [];
  const realizados = agendaData?.agendamentosHoje.filter((a) => a.status === "REALIZADA") ?? [];
  const total = agendaData?.agendamentosHoje.length ?? 0;
  const progressPct = total > 0 ? Math.round((realizados.length / total) * 100) : 0;

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Cards */}
        <div className="pt-2 px-4 lg:px-6">
          <DateFilterBadges selectedFilter={dateFilter} onFilterChange={setDateFilter} />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : estatisticas ? (
            <PagamentosCards estatisticas={estatisticas} />
          ) : null}
        </div>

        {/* Charts */}
        <div className="px-4 lg:px-6 pt-3 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Row 1 — Box 1: Comparativo de Receitas */}
            {loadingCharts ? (
              <div className="rounded-lg border border-border/50 bg-card p-3 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-slate-800">Comparativo de Receitas</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Particular vs Convênio</p>
                </div>
                {chartData && chartData.receitaComparativa.some((d) => d.particular > 0 || d.convenio > 0) ? (
                  <ChartContainer config={receitaComparativaConfig} className="h-[220px] w-full">
                    <BarChart data={chartData.receitaComparativa} barGap={2}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        width={55}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [formatCurrency(Number(value)), undefined]}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="particular" fill="var(--color-particular)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="convenio" fill="var(--color-convenio)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-xs text-slate-400">Sem dados no período</p>
                  </div>
                )}
              </div>
            )}

            {/* Row 1 — Box 2: Próximo Atendimento ── REDESIGNED */}
            {loadingAgenda ? (
              <div className="rounded-xl border border-border/50 bg-card p-4 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/60 p-4 relative overflow-hidden shadow-sm">
                {/* Subtle background shimmer */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none animate-shimmer"
                  style={{ backgroundSize: "200% 100%" }}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          {agendaData?.proximoAtendimento ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </>
                          ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300" />
                          )}
                        </span>
                        <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                          Próximo Atendimento
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-4">
                        {agendaData?.proximoAtendimento
                          ? "Paciente aguardando na fila"
                          : "Fila vazia no momento"}
                      </p>
                    </div>
                    {confirmados.length > 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-1">
                        <Users className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700">{confirmados.length}</span>
                      </div>
                    )}
                  </div>

                  {agendaData?.proximoAtendimento ? (() => {
                    const av = getAvatarStyle(agendaData.proximoAtendimento.paciente.nome);
                    return (
                      <div className="flex flex-col gap-3">
                        {/* Patient avatar + info */}
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            <div
                              className={`h-[60px] w-[60px] rounded-2xl bg-gradient-to-br ${av.gradient} flex items-center justify-center shadow-lg ${av.shadow} animate-glow-pulse`}
                            >
                              <span className="text-xl font-black text-white tracking-tight">
                                {getInitials(agendaData.proximoAtendimento.paciente.nome)}
                              </span>
                            </div>
                            {/* Glow halo */}
                            <div
                              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${av.gradient} opacity-20 blur-lg -z-10 scale-110`}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                              {agendaData.proximoAtendimento.paciente.nome}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Stethoscope className="h-3 w-3 text-slate-400" />
                              <p className="text-[10px] text-slate-500">
                                {agendaData.proximoAtendimento.tipoConsulta?.nome || "Consulta"}
                              </p>
                            </div>
                            <div className="mt-1.5">
                              {statusBadge(agendaData.proximoAtendimento.status)}
                            </div>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Horário</p>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              <p className="text-sm font-bold text-slate-700">
                                {formatTime(agendaData.proximoAtendimento.dataHora)}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Pagamento</p>
                            <p className="text-xs font-bold text-slate-700 truncate leading-tight mt-1">
                              {agendaData.proximoAtendimento.operadora
                                ? agendaData.proximoAtendimento.operadora.nomeFantasia ||
                                  agendaData.proximoAtendimento.operadora.razaoSocial
                                : "Particular"}
                            </p>
                          </div>
                        </div>

                        {/* Queue indicator */}
                        {confirmados.length > 1 && (
                          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Timer className="h-3.5 w-3.5 text-indigo-400" />
                              <p className="text-[11px] text-indigo-700 font-medium">
                                +{confirmados.length - 1} paciente{confirmados.length - 1 > 1 ? "s" : ""} na fila
                              </p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                        )}

                        {/* CTA Button */}
                        <button
                          onClick={() => handleIniciarAtendimento(agendaData.proximoAtendimento!.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                          <Play className="h-3.5 w-3.5 fill-white" />
                          Iniciar Atendimento
                        </button>
                      </div>
                    );
                  })() : (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <User className="h-7 w-7 text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-400">Nenhum paciente aguardando</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">A fila está vazia no momento</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Row 2 — Box 3: Receitas por Convênio */}
            {loadingCharts ? (
              <div className="rounded-lg border border-border/50 bg-card p-3 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-slate-800">Receitas por Convênio</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Comparativo por operadora no período</p>
                </div>
                {chartData && chartData.receitaPorConvenio.length > 0 ? (
                  <ChartContainer config={receitaConvenioConfig} className="h-[220px] w-full">
                    <BarChart
                      data={chartData.receitaPorConvenio}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="operadora"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        width={80}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
                          />
                        }
                      />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-xs text-slate-400">Sem receitas por convênio no período</p>
                  </div>
                )}
              </div>
            )}

            {/* Row 2 — Box 4: Agendamento Diário ── REDESIGNED */}
            {loadingAgenda ? (
              <div className="rounded-xl border border-border/50 bg-card p-4 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/60 p-4 shadow-sm">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                      Agendamento Diário
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{hojeCap}</p>
                  </div>
                  {total > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-700">{realizados.length}/{total}</div>
                        <div className="text-[9px] text-slate-400">realizados</div>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
                        <span className="text-xs font-black text-white">{total}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mb-3 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* Stats row */}
                {total > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-[10px] text-slate-500">{confirmados.length} aguardando</span>
                    </div>
                    <span className="text-slate-200">·</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-slate-500">{realizados.length} realizados</span>
                    </div>
                  </div>
                )}

                {/* Patient list */}
                {agendaData && total > 0 ? (
                  <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                    {agendaData.agendamentosHoje.map((ag, idx) => {
                      const av = getAvatarStyle(ag.paciente.nome);
                      const isActive = ag.status === "EM_ATENDIMENTO";
                      const isDone = ag.status === "REALIZADA";
                      return (
                        <div
                          key={ag.id}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-200 animate-slide-up ${
                            isActive
                              ? "border-blue-200 bg-blue-50/50 shadow-sm shadow-blue-100"
                              : isDone
                              ? "border-transparent bg-slate-50/50 opacity-55"
                              : "border-transparent bg-white/70 hover:bg-slate-50 hover:border-slate-100"
                          }`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          {/* Avatar */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${av.gradient} flex items-center justify-center shadow-sm`}
                          >
                            <span className="text-[11px] font-black text-white">
                              {getInitials(ag.paciente.nome)}
                            </span>
                          </div>

                          {/* Patient info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"}`}>
                              {ag.paciente.nome}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {ag.operadora
                                ? ag.operadora.nomeFantasia || ag.operadora.razaoSocial
                                : "Particular"}
                            </p>
                          </div>

                          {/* Status + time */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            {statusBadge(ag.status)}
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(ag.dataHora)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Calendar className="h-7 w-7 text-slate-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-400">Sem agendamentos hoje</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Nenhum check-in realizado</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
