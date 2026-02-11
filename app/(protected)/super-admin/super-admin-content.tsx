"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
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

const mockData: DadosGrafico[] = [
  { mes: "mar", faturamento: 12400, vendas: 8, churnRate: 2.1 },
  { mes: "abr", faturamento: 14200, vendas: 11, churnRate: 1.5 },
  { mes: "mai", faturamento: 13800, vendas: 9, churnRate: 3.2 },
  { mes: "jun", faturamento: 15600, vendas: 12, churnRate: 1.8 },
  { mes: "jul", faturamento: 16100, vendas: 14, churnRate: 0.9 },
  { mes: "ago", faturamento: 15300, vendas: 10, churnRate: 2.4 },
  { mes: "set", faturamento: 17200, vendas: 15, churnRate: 1.2 },
  { mes: "out", faturamento: 18500, vendas: 13, churnRate: 1.6 },
  { mes: "nov", faturamento: 19100, vendas: 16, churnRate: 0.8 },
  { mes: "dez", faturamento: 17800, vendas: 11, churnRate: 2.0 },
  { mes: "jan", faturamento: 20300, vendas: 18, churnRate: 1.1 },
  { mes: "fev", faturamento: 14500, vendas: 10, churnRate: 1.4 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SuperAdminContent({ statistics }: SuperAdminContentProps) {
  const [dadosGraficos] = useState<DadosGrafico[]>(mockData);

  const ultimoChurn = dadosGraficos[dadosGraficos.length - 1]?.churnRate || 0;
  const penultimoChurn = dadosGraficos.length > 1 ? dadosGraficos[dadosGraficos.length - 2]?.churnRate || 0 : 0;
  const churnDiff = ultimoChurn - penultimoChurn;

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
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Receita</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 12 meses</p>
              </div>
              <ChartContainer config={faturamentoConfig} className="h-[220px] w-full">
                <AreaChart data={dadosGraficos}>
                  <defs>
                    <linearGradient id="faturamentoGrad" x1="0" y1="0" x2="0" y2="1">
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
                    width={45}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#334155"
                    strokeWidth={2}
                    fill="url(#faturamentoGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Vendas */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Vendas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Total mensal nos últimos 12 meses</p>
              </div>
              <ChartContainer config={vendasConfig} className="h-[220px] w-full">
                <BarChart data={dadosGraficos} barGap={2}>
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
                  <Bar dataKey="vendas" fill="var(--color-vendas)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Churn Rate */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Churn Rate</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Taxa de cancelamento mensal</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {churnDiff <= 0 ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <TrendingDown className="h-3 w-3" />{Math.abs(churnDiff).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500">
                      <TrendingUp className="h-3 w-3" />+{churnDiff.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <ChartContainer config={churnConfig} className="h-[220px] w-full">
                <LineChart data={dadosGraficos}>
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
                        formatter={(value) => [`${value}%`, "Churn Rate"]}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="churnRate"
                    stroke="var(--color-churnRate)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-churnRate)", strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
