"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Clock } from "lucide-react";
import { PagamentosCards } from "@/components/pagamentos-cards";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
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
}

interface ChartData {
  presencialVsTele: { mes: string; presencial: number; telemedicina: number }[];
  noShowPorMes: { mes: string; taxa: number; canceladas: number; total: number }[];
  tempoMedioPorMes: { mes: string; minutos: number }[];
  faturamentoParticular: {
    semanas: { label: string; valor: number }[];
    hoje: number;
    mes: number;
  };
}

const presencialTeleConfig: ChartConfig = {
  presencial: {
    label: "Presencial",
    color: "#334155",
  },
  telemedicina: {
    label: "Telemedicina",
    color: "#7dd3fc",
  },
};

const noShowConfig: ChartConfig = {
  taxa: {
    label: "No-show %",
    color: "#334155",
  },
};

const tempoConfig: ChartConfig = {
  minutos: {
    label: "Minutos",
    color: "#7dd3fc",
  },
};

const faturamentoConfig: ChartConfig = {
  valor: {
    label: "Faturamento",
    color: "#38bdf8",
  },
};


export function MedicoContent({ nome }: MedicoContentProps) {
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    fetch("/api/medico/dashboard/estatisticas")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setEstatisticas)
      .catch((e) => console.error("Erro estatísticas:", e))
      .finally(() => setLoading(false));

    fetch("/api/medico/dashboard/charts")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => setChartData({
        presencialVsTele: json.presencialVsTele ?? [],
        noShowPorMes: json.noShowPorMes ?? [],
        tempoMedioPorMes: json.tempoMedioPorMes ?? [],
        faturamentoParticular: json.faturamentoParticular ?? { semanas: [], hoje: 0, mes: 0 },
      }))
      .catch((e) => console.error("Erro charts:", e))
      .finally(() => setLoadingCharts(false));
  }, []);

  const primeiroNome = nome.split(" ")[0];

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Cards */}
        <div className="pt-2 px-4 lg:px-6">
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
            {loadingCharts && (
              <>
                {[1,2,3,4].map((i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-card p-3 h-[290px] animate-pulse" />
                ))}
              </>
            )}
            {!loadingCharts && chartData && (<>
              {/* Consultas Presenciais × Telemedicina */}
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-slate-800">Presencial vs Telemedicina</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
                </div>
                <ChartContainer config={presencialTeleConfig} className="h-[220px] w-full">
                  <BarChart data={chartData!.presencialVsTele} barGap={2}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="presencial" fill="var(--color-presencial)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="telemedicina" fill="var(--color-telemedicina)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Taxa de Faltas (No-show) */}
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">Taxa de Faltas</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Percentual de no-show por mês</p>
                  </div>
                  {chartData!.noShowPorMes.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {(() => {
                        const ultimo = chartData!.noShowPorMes[chartData!.noShowPorMes.length - 1];
                        const penultimo = chartData!.noShowPorMes.length > 1
                          ? chartData!.noShowPorMes[chartData!.noShowPorMes.length - 2]
                          : null;
                        const diff = penultimo ? ultimo.taxa - penultimo.taxa : 0;
                        return diff <= 0 ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <TrendingDown className="h-3 w-3" />{Math.abs(diff)}%
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <TrendingUp className="h-3 w-3" />+{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <ChartContainer config={noShowConfig} className="h-[220px] w-full">
                  <AreaChart data={chartData!.noShowPorMes}>
                    <defs>
                      <linearGradient id="noShowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#334155" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      width={30}
                      unit="%"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [`${value}%`, "No-show"]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="taxa"
                      stroke="#334155"
                      strokeWidth={2}
                      fill="url(#noShowGrad)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Tempo Médio de Consulta */}
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">Tempo Médio de Consulta</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Duração média em minutos</p>
                  </div>
                  {chartData!.tempoMedioPorMes.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">
                        {chartData!.tempoMedioPorMes[chartData!.tempoMedioPorMes.length - 1]?.minutos || 0} min
                      </span>
                    </div>
                  )}
                </div>
                <ChartContainer config={tempoConfig} className="h-[220px] w-full">
                  <LineChart data={chartData!.tempoMedioPorMes}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      width={30}
                      unit="m"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [`${value} min`, "Tempo médio"]}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="minutos"
                      stroke="var(--color-minutos)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-minutos)", strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Faturamento Particular */}
              <div className="rounded-lg border border-border/50 bg-card p-3">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">Faturamento Particular</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Mês atual por semana</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Hoje</p>
                      <p className="text-xs font-semibold text-slate-700">
                        R$ {chartData!.faturamentoParticular.hoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mês</p>
                      <p className="text-xs font-semibold text-slate-700">
                        R$ {chartData!.faturamentoParticular.mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                <ChartContainer config={faturamentoConfig} className="h-[220px] w-full">
                  <BarChart data={chartData!.faturamentoParticular.semanas}>
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
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      width={45}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                            "Faturamento",
                          ]}
                        />
                      }
                    />
                    <Bar dataKey="valor" fill="var(--color-valor)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </>)}
            </div>
        </div>
      </div>
    </div>
  );
}
