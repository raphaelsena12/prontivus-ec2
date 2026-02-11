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

const conveniosConfig: ChartConfig = {
  unimed: {
    label: "Unimed",
    color: "#334155",
  },
  bradesco: {
    label: "Bradesco Saúde",
    color: "#7dd3fc",
  },
  sulamerica: {
    label: "SulAmérica",
    color: "#38bdf8",
  },
  amil: {
    label: "Amil",
    color: "#94a3b8",
  },
  particular: {
    label: "Particular",
    color: "#cbd5e1",
  },
};

const mockFaturamento = {
  semanas: [
    { label: "Sem 1", valor: 4200.00 },
    { label: "Sem 2", valor: 5650.50 },
    { label: "Sem 3", valor: 3800.00 },
    { label: "Sem 4", valor: 6100.75 },
    { label: "Sem 5", valor: 2050.00 },
  ],
  hoje: 1250.00,
  mes: 21800.25,
};

const mockConsultas = [
  { mes: "set", realizadas: 52, faltas: 6, cancelamentos: 4 },
  { mes: "out", realizadas: 48, faltas: 8, cancelamentos: 3 },
  { mes: "nov", realizadas: 58, faltas: 5, cancelamentos: 7 },
  { mes: "dez", realizadas: 42, faltas: 10, cancelamentos: 5 },
  { mes: "jan", realizadas: 62, faltas: 4, cancelamentos: 6 },
  { mes: "fev", realizadas: 38, faltas: 3, cancelamentos: 2 },
];

const mockConvenios = [
  { convenio: "unimed", valor: 145 },
  { convenio: "bradesco", valor: 98 },
  { convenio: "sulamerica", valor: 72 },
  { convenio: "amil", valor: 54 },
  { convenio: "particular", valor: 86 },
];

export function SecretariaContent({ nome }: SecretariaContentProps) {
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstatisticas = async () => {
      try {
        const response = await fetch("/api/secretaria/dashboard/estatisticas");
        if (!response.ok) throw new Error("Erro ao carregar estatísticas");
        const data = await response.json();
        setEstatisticas(data);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstatisticas();
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
                      R$ {mockFaturamento.hoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mês</p>
                    <p className="text-xs font-semibold text-slate-700">
                      R$ {mockFaturamento.mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
              <ChartContainer config={faturamentoConfig} className="h-[220px] w-full">
                <BarChart data={mockFaturamento.semanas}>
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
            </div>

            {/* Consultas Finalizadas - Barras Empilhadas */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Consultas Finalizadas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
              </div>
              <ChartContainer config={consultasConfig} className="h-[220px] w-full">
                <BarChart data={mockConsultas} barGap={0}>
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
              <div className="flex items-center justify-center gap-4 pt-3">
                {(["realizadas", "faltas", "cancelamentos"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: `var(--color-${key})` }}
                    />
                    <span className="text-muted-foreground capitalize">{consultasConfig[key].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Principais Convênios - Pizza */}
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Principais Convênios</h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribuição de atendimentos</p>
              </div>
              <ChartContainer config={conveniosConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={mockConvenios}
                    dataKey="valor"
                    nameKey="convenio"
                    innerRadius={45}
                    outerRadius={85}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {mockConvenios.map((entry) => (
                      <Cell
                        key={entry.convenio}
                        fill={`var(--color-${entry.convenio})`}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                {mockConvenios.map((entry) => {
                  const config = conveniosConfig[entry.convenio as keyof typeof conveniosConfig];
                  return (
                    <div key={entry.convenio} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: `var(--color-${entry.convenio})` }}
                      />
                      <span className="text-muted-foreground">{config?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
