"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PagamentosCards } from "@/components/pagamentos-cards";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";

interface SecretariaContentProps {
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

interface ChartsData {
  faturamentoParticular: { semanas: { label: string; valor: number }[]; hoje: number; mes: number };
  consultasFinalizadas: { mes: string; realizadas: number; faltas: number; cancelamentos: number }[];
  convenios: { convenio: string; valor: number }[];
}

const faturamentoConfig: ChartConfig = {
  valor: {
    label: "Faturamento",
    color: "#38bdf8",
  },
};

const consultasConfig: ChartConfig = {
  realizadas: {
    label: "Realizadas",
    color: "#334155",
  },
  faltas: {
    label: "Faltas",
    color: "#7dd3fc",
  },
  cancelamentos: {
    label: "Cancelamentos",
    color: "#cbd5e1",
  },
};



export function SecretariaContent({ nome }: SecretariaContentProps) {
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    fetch("/api/secretaria/dashboard/estatisticas")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setEstatisticas)
      .catch((e) => console.error("Erro estatísticas:", e))
      .finally(() => setLoading(false));

    fetch("/api/secretaria/dashboard/charts")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setChartsData)
      .catch((e) => console.error("Erro charts:", e))
      .finally(() => setLoadingCharts(false));
  }, []);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        <div className="px-4 lg:px-6 pt-2">
          {/* Cards de Estatísticas */}
          <div className="pb-3">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : estatisticas ? (
              <PagamentosCards estatisticas={estatisticas} />
            ) : null}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Faturamento Particular */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Faturamento Particular</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mês atual por semana</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Hoje</p>
                    <p className="text-xs font-semibold text-slate-700">
                      R$ {(chartsData?.faturamentoParticular.hoje ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mês</p>
                    <p className="text-xs font-semibold text-slate-700">
                      R$ {(chartsData?.faturamentoParticular.mes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
              {loadingCharts ? (
                <div className="h-[220px] animate-pulse rounded-md bg-slate-100" />
              ) : (
              <ChartContainer config={faturamentoConfig} className="h-[220px] w-full">
                <BarChart data={chartsData?.faturamentoParticular.semanas ?? []}>
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
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
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
              )}
            </div>

            {/* Consultas Finalizadas - Barras Empilhadas */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Consultas Finalizadas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
              </div>
              {loadingCharts ? (
                <div className="h-[220px] animate-pulse rounded-md bg-slate-100" />
              ) : (
              <ChartContainer config={consultasConfig} className="h-[220px] w-full">
                <BarChart data={chartsData?.consultasFinalizadas ?? []} barGap={0}>
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
                  <Bar dataKey="realizadas" stackId="a" fill="var(--color-realizadas)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="faltas" stackId="a" fill="var(--color-faltas)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="cancelamentos" stackId="a" fill="var(--color-cancelamentos)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
              )}
              <div className="flex items-center justify-center gap-4 pt-3">
                {(["realizadas", "faltas", "cancelamentos"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: `var(--color-${key})` }} />
                    <span className="text-muted-foreground capitalize">{consultasConfig[key].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Principais Convênios — dados reais */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Principais Convênios</h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribuição de atendimentos no mês</p>
              </div>
              {loadingCharts ? (
                <div className="h-[220px] animate-pulse rounded-md bg-slate-100" />
              ) : (chartsData?.convenios && chartsData.convenios.length > 0) ? (
                <>
                  <ChartContainer config={{}} className="h-[180px] w-full">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie data={chartsData.convenios} dataKey="valor" nameKey="convenio"
                        innerRadius={45} outerRadius={75} strokeWidth={2} stroke="#fff">
                        {chartsData.convenios.map((_, i) => (
                          <Cell key={i} fill={["#6366f1","#0ea5e9","#10b981","#f59e0b","#f43f5e"][i % 5]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {chartsData.convenios.map((entry, i) => (
                      <div key={entry.convenio} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: ["#6366f1","#0ea5e9","#10b981","#f59e0b","#f43f5e"][i % 5] }} />
                        <span className="text-muted-foreground">{entry.convenio}</span>
                        <span className="font-medium text-slate-600">({entry.valor})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                  Nenhum atendimento este mês
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
