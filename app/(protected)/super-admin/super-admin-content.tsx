"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { EstatisticasCards } from "@/components/estatisticas-cards";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Line,
  LineChart,
} from "recharts";

interface SuperAdminContentProps {
  statistics: {
    totalClinicasAtivas: number;
    totalClinicasInativas: number;
    totalUsuarios: number;
    receitaMensal: number;
    totalClinicas: number;
    receitaTotal: number;
  };
}

interface DadosGrafico {
  mes: string;
  faturamento: number;
  vendas: number;
  churnRate: number;
}

const faturamentoConfig: ChartConfig = {
  faturamento: {
    label: "Receita",
    color: "#334155",
  },
};

const vendasConfig: ChartConfig = {
  vendas: {
    label: "Vendas",
    color: "#38bdf8",
  },
};

const churnConfig: ChartConfig = {
  churnRate: {
    label: "Churn Rate",
    color: "#334155",
  },
};


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SuperAdminContent({ statistics }: SuperAdminContentProps) {
  const [dadosGraficos, setDadosGraficos] = useState<DadosGrafico[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/dashboard/graficos")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => setDadosGraficos(json.dados ?? []))
      .catch(() => toast.error("Erro ao carregar gráficos"))
      .finally(() => setLoadingCharts(false));
  }, []);

  const ultimoChurn = dadosGraficos[dadosGraficos.length - 1]?.churnRate || 0;
  const penultimoChurn = dadosGraficos.length > 1 ? dadosGraficos[dadosGraficos.length - 2]?.churnRate || 0 : 0;
  const churnDiff = ultimoChurn - penultimoChurn;

  const chartSkeleton = <div className="h-[220px] w-full animate-pulse rounded-md bg-slate-100" />;

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Cards */}
        <div className="pt-2">
          <EstatisticasCards
            estatisticas={{
              totalClinicas: statistics.totalClinicas,
              totalUsuarios: statistics.totalUsuarios,
              receitaMensal: statistics.receitaMensal,
              receitaTotal: statistics.receitaTotal,
            }}
          />
        </div>

        {/* Charts */}
        <div className="px-4 lg:px-6 pt-5 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Faturamento */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm" style={{ borderLeft: "3px solid #6366f1" }}>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Faturamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">Receita total gerada — últimos 12 meses</p>
              </div>
              {loadingCharts ? chartSkeleton : (
                <ChartContainer config={faturamentoConfig} className="h-[220px] w-full">
                  <AreaChart data={dadosGraficos}>
                    <defs>
                      <linearGradient id="faturamentoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={48}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrency(Number(v)), "Receita"]} />} />
                    <Area type="monotone" dataKey="faturamento" stroke="#6366f1" strokeWidth={2} fill="url(#faturamentoGrad)" dot={false} />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>

            {/* Vendas */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm" style={{ borderLeft: "3px solid #0ea5e9" }}>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Vendas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Assinaturas pagas — últimos 12 meses</p>
              </div>
              {loadingCharts ? chartSkeleton : (
                <ChartContainer config={vendasConfig} className="h-[220px] w-full">
                  <BarChart data={dadosGraficos} barGap={2}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={30} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [v, "Assinaturas"]} />} />
                    <Bar dataKey="vendas" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </div>

            {/* Churn Rate */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm" style={{ borderLeft: "3px solid #f43f5e" }}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Churn Rate</h3>
                  <p className="text-xs text-slate-400 mt-0.5">% clínicas canceladas — últimos 12 meses</p>
                </div>
                {!loadingCharts && dadosGraficos.length > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-lg font-bold text-slate-800">{ultimoChurn.toFixed(1)}%</span>
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${churnDiff <= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {churnDiff <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {Math.abs(churnDiff).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {loadingCharts ? chartSkeleton : (
                <ChartContainer config={churnConfig} className="h-[220px] w-full">
                  <LineChart data={dadosGraficos}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={30} unit="%" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${v}%`, "Churn Rate"]} />} />
                    <Line type="monotone" dataKey="churnRate" stroke="#f43f5e" strokeWidth={2}
                      dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
