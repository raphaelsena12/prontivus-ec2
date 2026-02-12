"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
} from "lucide-react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
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

interface Resumo {
  totalCobrado: number;
  totalRepassado: number;
  totalReceber: number;
  totalRecebido: number;
  totalPagar: number;
  consultasRealizadas: number;
  consultasAgendadas: number;
  totalConsultas: number;
}

export function DashboardFinanceiroContent() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/medico/dashboard-financeiro");
        if (response.ok) {
          const data = await response.json();
          setResumo(data.resumo);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Mock data para gráficos (substituir por dados reais quando disponível)
  const mockChartData = {
    receitaPorMes: [
      { mes: "set", receita: 12500.00 },
      { mes: "out", receita: 15200.50 },
      { mes: "nov", receita: 13800.00 },
      { mes: "dez", receita: 16800.75 },
      { mes: "jan", receita: 14500.00 },
      { mes: "fev", receita: 13200.00 },
    ],
    entradasVsSaidas: [
      { mes: "set", entradas: 12500.00, saidas: 3200.00 },
      { mes: "out", entradas: 15200.50, saidas: 4100.00 },
      { mes: "nov", entradas: 13800.00, saidas: 3800.00 },
      { mes: "dez", entradas: 16800.75, saidas: 4500.00 },
      { mes: "jan", entradas: 14500.00, saidas: 3900.00 },
      { mes: "fev", entradas: 13200.00, saidas: 3500.00 },
    ],
    contasReceber: [
      { mes: "set", pendente: 8500.00, recebido: 4000.00 },
      { mes: "out", pendente: 9200.00, recebido: 6000.00 },
      { mes: "nov", pendente: 7800.00, recebido: 5800.00 },
      { mes: "dez", pendente: 10200.00, recebido: 6600.00 },
      { mes: "jan", pendente: 8800.00, recebido: 5700.00 },
      { mes: "fev", pendente: 7500.00, recebido: 4500.00 },
    ],
  };

  const receitaConfig: ChartConfig = {
    receita: {
      label: "Receita",
      color: "#38bdf8",
    },
  };

  const entradasSaidasConfig: ChartConfig = {
    entradas: {
      label: "Entradas",
      color: "#10b981",
    },
    saidas: {
      label: "Saídas",
      color: "#ef4444",
    },
  };

  const contasConfig: ChartConfig = {
    pendente: {
      label: "Pendente",
      color: "#f59e0b",
    },
    recebido: {
      label: "Recebido",
      color: "#10b981",
    },
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col">
        <div className="flex flex-col">
          <div className="pt-2 px-4 lg:px-6">
            <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="p-2">
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Cards */}
        <div className="pt-2 px-4 lg:px-6">
          {resumo && (
            <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                        Total Cobrado
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(resumo.totalCobrado)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                        <FileText className="size-3" />
                        <span>{resumo.totalConsultas} consultas</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <DollarSign className="size-3 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                        Total Repassado
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(resumo.totalRepassado)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                        <IconTrendingUp className="size-3" />
                        <span>Valor repassado ao médico</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="size-3 text-green-600" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                        A Receber
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(resumo.totalReceber)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <Receipt className="size-3" />
                        <span>Contas pendentes</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Receipt className="size-3 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                        A Pagar
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(resumo.totalPagar)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <IconTrendingDown className="size-3" />
                        <span>Contas pendentes</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <TrendingDown className="size-3 text-red-600" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                        Total Recebido
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(resumo.totalRecebido)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                        <IconTrendingUp className="size-3" />
                        <span>Valor já recebido</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="size-3 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="px-4 lg:px-6 pt-3 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Receita por Mês */}
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-800">Receita por Mês</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
              </div>
              <ChartContainer config={receitaConfig} className="h-[220px] w-full">
                <BarChart data={mockChartData.receitaPorMes} barGap={2}>
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
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          "Receita",
                        ]}
                      />
                    }
                  />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Entradas vs Saídas */}
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-800">Entradas vs Saídas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
              </div>
              <ChartContainer config={entradasSaidasConfig} className="h-[220px] w-full">
                <BarChart data={mockChartData.entradasVsSaidas} barGap={2}>
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
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                        ]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saidas" fill="var(--color-saidas)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Contas a Receber */}
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-800">Contas a Receber</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pendente vs Recebido</p>
              </div>
              <ChartContainer config={contasConfig} className="h-[220px] w-full">
                <AreaChart data={mockChartData.contasReceber}>
                  <defs>
                    <linearGradient id="pendenteGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="recebidoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                        ]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="pendente"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#pendenteGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="recebido"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#recebidoGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}













