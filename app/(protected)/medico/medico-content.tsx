"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, User, Calendar, ChevronRight, Play } from "lucide-react";
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

export function MedicoContent({ nome }: MedicoContentProps) {
  const router = useRouter();
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("mensal");

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
    const map: Record<string, { label: string; className: string }> = {
      CONFIRMADA:     { label: "Aguardando",    className: "bg-amber-100 text-amber-700" },
      EM_ATENDIMENTO: { label: "Em Atendimento", className: "bg-blue-100 text-blue-700" },
      REALIZADA:      { label: "Realizado",      className: "bg-emerald-100 text-emerald-700" },
    };
    const s = map[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
    return (
      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${s.className}`}>
        {s.label}
      </span>
    );
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

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

            {/* Row 1 — Box 2: Próximo Atendimento */}
            {loadingAgenda ? (
              <div className="rounded-lg border border-border/50 bg-card p-3 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-slate-800">Próximo Atendimento</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Próximo paciente com check-in realizado</p>
                </div>
                {agendaData?.proximoAtendimento ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {agendaData.proximoAtendimento.paciente.nome}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {agendaData.proximoAtendimento.tipoConsulta?.nome || "Consulta"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Horário</p>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <p className="text-xs font-semibold text-slate-700">
                            {formatTime(agendaData.proximoAtendimento.dataHora)}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Pagamento</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {agendaData.proximoAtendimento.operadora
                            ? agendaData.proximoAtendimento.operadora.nomeFantasia ||
                              agendaData.proximoAtendimento.operadora.razaoSocial
                            : "Particular"}
                        </p>
                      </div>
                    </div>

                    {agendaData.agendamentosHoje.length > 1 && (
                      <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-blue-700">
                          +{agendaData.agendamentosHoje.length - 1} paciente
                          {agendaData.agendamentosHoje.length - 1 > 1 ? "s" : ""} aguardando
                        </p>
                        <ChevronRight className="h-3 w-3 text-blue-400" />
                      </div>
                    )}

                    {agendaData?.proximoAtendimento && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleIniciarAtendimento(agendaData.proximoAtendimento!.id)}
                          className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          Iniciar Atendimento
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400">Nenhum paciente aguardando</p>
                  </div>
                )}
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

            {/* Row 2 — Box 4: Agendamento Diário */}
            {loadingAgenda ? (
              <div className="rounded-lg border border-border/50 bg-card p-3 h-[290px] animate-pulse" />
            ) : (
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">Agendamento Diário</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pacientes com check-in hoje</p>
                  </div>
                  {agendaData && agendaData.agendamentosHoje.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {agendaData.agendamentosHoje.length}
                    </span>
                  )}
                </div>
                {agendaData && agendaData.agendamentosHoje.length > 0 ? (
                  <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                    {agendaData.agendamentosHoje.map((ag, idx) => (
                      <div
                        key={ag.id}
                        className="flex items-center gap-2.5 rounded-md p-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-slate-500">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {ag.paciente.nome}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {ag.operadora
                              ? ag.operadora.nomeFantasia || ag.operadora.razaoSocial
                              : "Particular"}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {statusBadge(ag.status)}
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(ag.dataHora)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400">Sem agendamentos confirmados hoje</p>
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
