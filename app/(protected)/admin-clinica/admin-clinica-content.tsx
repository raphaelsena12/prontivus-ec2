"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PagamentosCards } from "@/components/pagamentos-cards";
import { StatusClinica, TipoPlano } from "@/lib/generated/prisma";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";

interface AdminClinicaContentProps {
  data: {
    clinica: {
      id: string;
      nome: string;
      cnpj: string;
      email: string;
      telefone: string | null;
      status: StatusClinica;
      tokensMensaisDisponiveis: number;
      tokensConsumidos: number;
      telemedicineHabilitada: boolean;
      dataContratacao: Date;
      dataExpiracao: Date | null;
      plano: {
        nome: TipoPlano;
        tokensMensais: number;
        preco: number;
        telemedicineHabilitada: boolean;
      };
    };
    estatisticas: {
      totalMedicos: number;
      totalSecretarias: number;
      totalPacientes: number;
    };
    percentualTokensUsado: number;
  };
}

interface DashboardData {
  faturamentoClinica: number;
  faturamentoPorMedico: Array<{
    medicoId: string;
    medicoNome: string;
    valor: number;
    quantidade: number;
  }>;
  totalVendas: number;
  periodo: {
    dataInicio: string | null;
    dataFim: string | null;
  };
}

interface Estatisticas {
  totalPagamentos: number;
  pagamentosPendentes: number;
  pagamentosPagos: number;
  pagamentosVencidos: number;
  receitaMesAtual: number;
  receitaTotal: number;
}

interface DadosGraficoMensal {
  mes: string;
  faturamento: number;
  vendas: number;
  contasPagar: number;
  contasReceber: number;
}

interface DadosContas {
  totalPagar: number;
  totalReceber: number;
  dadosMensais: DadosGraficoMensal[];
}

// Configurações dos gráficos
const faturamentoConfig: ChartConfig = {
  faturamento: {
    label: "Faturamento",
    color: "#334155",
  },
};

const vendasConfig: ChartConfig = {
  vendas: {
    label: "Vendas",
    color: "#38bdf8",
  },
};

const contasPagarConfig: ChartConfig = {
  contasPagar: {
    label: "Contas a Pagar",
    color: "#ef4444",
  },
};

const contasReceberConfig: ChartConfig = {
  contasReceber: {
    label: "Contas a Receber",
    color: "#10b981",
  },
};

const tokensConfig: ChartConfig = {
  utilizados: {
    label: "Utilizados",
    color: "#3b82f6",
  },
  disponiveis: {
    label: "Disponíveis",
    color: "#10b981",
  },
};

export function AdminClinicaContent({ data }: AdminClinicaContentProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primeiro dia do mês
    return date.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dataInicio) params.append("dataInicio", dataInicio);
      if (dataFim) params.append("dataFim", dataFim);
      
      const response = await fetch(`/api/admin-clinica/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar dados do dashboard");
      const dashboard = await response.json();
      setDashboardData(dashboard);
    } catch (error) {
      toast.error("Erro ao carregar dados do dashboard");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Carregar dados do mês atual para o gráfico de faturamento por médico
  useEffect(() => {
    const fetchDashboardAtual = async () => {
      try {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        const params = new URLSearchParams();
        params.append("dataInicio", primeiroDia.toISOString().split("T")[0]);
        params.append("dataFim", ultimoDia.toISOString().split("T")[0]);
        
        const response = await fetch(`/api/admin-clinica/dashboard?${params.toString()}`);
        if (response.ok) {
          const dashboard = await response.json();
          setDashboardData(dashboard);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard atual:", error);
      }
    };

    fetchDashboardAtual();
  }, []);


  const tokensRestantes =
    data.clinica.tokensMensaisDisponiveis - data.clinica.tokensConsumidos;

  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(true);
  const [dadosGraficos, setDadosGraficos] = useState<DadosGraficoMensal[]>([]);
  const [dadosContas, setDadosContas] = useState<DadosContas | null>(null);
  const [loadingGraficos, setLoadingGraficos] = useState(true);

  useEffect(() => {
    const fetchEstatisticas = async () => {
      try {
        const response = await fetch("/api/admin-clinica/dashboard/estatisticas");
        if (!response.ok) throw new Error("Erro ao carregar estatísticas");
        const data = await response.json();
        setEstatisticas(data);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoadingEstatisticas(false);
      }
    };

    fetchEstatisticas();
  }, []);

  // Função para gerar dados dos últimos 12 meses
  const gerarDadosMensais = useCallback(async () => {
    try {
      setLoadingGraficos(true);
      const meses = [];
      const hoje = new Date();
      
      // Gerar últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesNome = data.toLocaleDateString("pt-BR", { month: "short" });
        meses.push({
          mes: mesNome,
          dataInicio: new Date(data.getFullYear(), data.getMonth(), 1).toISOString().split("T")[0],
          dataFim: new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString().split("T")[0],
        });
      }

      // Buscar dados para cada mês
      const dadosMensais = await Promise.all(
        meses.map(async (mes) => {
          const [dashboardRes, contasRes] = await Promise.all([
            fetch(`/api/admin-clinica/dashboard?dataInicio=${mes.dataInicio}&dataFim=${mes.dataFim}`),
            fetch(`/api/admin-clinica/dashboard/contas?dataInicio=${mes.dataInicio}&dataFim=${mes.dataFim}`),
          ]);

          const dashboard = dashboardRes.ok ? await dashboardRes.json() : { faturamentoClinica: 0, totalVendas: 0 };
          const contas = contasRes.ok ? await contasRes.json() : { totalPagar: 0, totalReceber: 0 };

          return {
            mes: mes.mes,
            faturamento: dashboard.faturamentoClinica || 0,
            vendas: dashboard.totalVendas || 0,
            contasPagar: contas.totalPagar || 0,
            contasReceber: contas.totalReceber || 0,
          };
        })
      );

      setDadosGraficos(dadosMensais);
    } catch (error) {
      console.error("Erro ao carregar dados dos gráficos:", error);
      toast.error("Erro ao carregar dados dos gráficos");
    } finally {
      setLoadingGraficos(false);
    }
  }, []);

  useEffect(() => {
    gerarDadosMensais();
  }, [gerarDadosMensais]);

  // Buscar dados de contas a pagar/receber
  useEffect(() => {
    const fetchContas = async () => {
      try {
        const response = await fetch("/api/admin-clinica/dashboard/contas");
        if (response.ok) {
          const data = await response.json();
          setDadosContas(data);
        }
      } catch (error) {
        console.error("Erro ao carregar contas:", error);
      }
    };

    fetchContas();
  }, []);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Cards de Estatísticas */}
      <div className="mb-6">
        {loadingEstatisticas ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <PagamentosCards 
            estatisticas={estatisticas || {
              totalPagamentos: 0,
              pagamentosPendentes: 0,
              pagamentosPagos: 0,
              pagamentosVencidos: 0,
              receitaMesAtual: 0,
              receitaTotal: 0,
            }} 
          />
        )}
      </div>

          {/* Gráficos do Dashboard */}
          {loadingGraficos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Linha 1: Faturamento Clínica */}
              <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Faturamento Clínica</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Últimos 12 meses</p>
                </div>
                <ChartContainer config={faturamentoConfig} className="h-[180px] w-full">
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
                          formatter={(value) => [formatCurrency(Number(value)), "Faturamento"]}
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

              {/* Linha 1: Faturamento por Médico */}
              {dashboardData && dashboardData.faturamentoPorMedico.length > 0 ? (
                <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Faturamento por Médico</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Receita gerada por cada médico</p>
                  </div>
                  <ChartContainer config={faturamentoConfig} className="h-[180px] w-full">
                    <BarChart
                      data={dashboardData.faturamentoPorMedico.map((item) => ({
                        nome: item.medicoNome.length > 10
                          ? item.medicoNome.substring(0, 10) + "..."
                          : item.medicoNome,
                        faturamento: item.valor,
                      }))}
                      barGap={2}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="nome"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        width={45}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [
                              formatCurrency(Number(value)),
                              "Faturamento",
                            ]}
                          />
                        }
                      />
                      <Bar
                        dataKey="faturamento"
                        fill="var(--color-faturamento)"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Faturamento por Médico</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Receita gerada por cada médico</p>
                  </div>
                  <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                </div>
              )}

              {/* Linha 2: Vendas de Atendimentos */}
              <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Vendas de Atendimentos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Total mensal nos últimos 12 meses</p>
                </div>
                <ChartContainer config={vendasConfig} className="h-[180px] w-full">
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
                    <Bar dataKey="vendas" fill="var(--color-vendas)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Linha 2: Tokens Utilizados */}
              <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Uso de Tokens</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Distribuição de tokens utilizados e disponíveis</p>
                </div>
                <ChartContainer config={tokensConfig} className="h-[180px] w-full">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Utilizados",
                          value: data.clinica.tokensConsumidos,
                          fill: "var(--color-utilizados)",
                        },
                        {
                          name: "Disponíveis",
                          value: tokensRestantes > 0 ? tokensRestantes : 0,
                          fill: "var(--color-disponiveis)",
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={60}
                      dataKey="value"
                    >
                      <Cell fill="var(--color-utilizados)" />
                      <Cell fill="var(--color-disponiveis)" />
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            Number(value).toLocaleString("pt-BR"),
                            "Tokens",
                          ]}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Linha 3: Contas a Pagar */}
              <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Contas a Pagar</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Últimos 12 meses</p>
                </div>
                <ChartContainer config={contasPagarConfig} className="h-[180px] w-full">
                  <AreaChart data={dadosGraficos}>
                    <defs>
                      <linearGradient id="contasPagarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      width={40}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value)), "Contas a Pagar"]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="contasPagar"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#contasPagarGrad)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Linha 3: Contas a Receber */}
              <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Contas a Receber</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Últimos 12 meses</p>
                </div>
                <ChartContainer config={contasReceberConfig} className="h-[180px] w-full">
                  <AreaChart data={dadosGraficos}>
                    <defs>
                      <linearGradient id="contasReceberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      width={40}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value)), "Contas a Receber"]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="contasReceber"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#contasReceberGrad)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          )}
    </div>
  );
}
