"use client";

import { useState, useEffect } from "react";
import { StatusClinica, TipoPlano } from "@/lib/generated/prisma";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area, AreaChart, Bar, BarChart,
  CartesianGrid, XAxis, YAxis,
  Pie, PieChart, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, FileText, Clock,
  DollarSign, Activity, Stethoscope, Zap,
  CheckCircle2,
} from "lucide-react";

interface AdminClinicaContentProps {
  data: {
    clinica: {
      id: string; nome: string; cnpj: string; email: string;
      telefone: string | null; status: StatusClinica;
      tokensMensaisDisponiveis: number; tokensConsumidos: number;
      telemedicineHabilitada: boolean; dataContratacao: Date;
      dataExpiracao: Date | null;
      plano: { nome: TipoPlano; tokensMensais: number; preco: number; telemedicineHabilitada: boolean };
    };
    estatisticas: { totalMedicos: number; totalSecretarias: number; totalPacientes: number };
    percentualTokensUsado: number;
  };
}

interface OverviewData {
  cards: {
    totalConsultas: number; pendentes: number; pagas: number; vencidas: number;
    receitaMes: number; receitaTotal: number;
    variacaoReceita: number; variacaoConsultas: number;
  };
  statusBreakdown: { agendadas: number; confirmadas: number; emAtendimento: number; realizadas: number };
  trend: Array<{ mes: string; faturamento: number; consultas: number; contasPagar: number; contasReceber: number }>;
  topMedicos: Array<{ medicoId: string; nome: string; receita: number; consultas: number }>;
}

const trendConfig: ChartConfig = {
  faturamento: { label: "Faturamento", color: "#6366f1" },
  contasReceber: { label: "A Receber", color: "#10b981" },
  contasPagar: { label: "A Pagar", color: "#f43f5e" },
};
const STATUS_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981"];

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className ?? ""}`} />;
}

function KpiCard({ label, value, sub, trend, icon, accent, loading }: {
  label: string; value: string; sub: string; trend?: number;
  icon: React.ReactNode; accent: string; loading?: boolean;
}) {
  if (loading) return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <Sk className="h-3 w-20 mb-3" /><Sk className="h-7 w-28 mb-2" /><Sk className="h-3 w-16" />
    </div>
  );
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}18` }}>
          <div style={{ color: accent }} className="[&>svg]:h-4 [&>svg]:w-4">{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, loading, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? <Sk className="h-[220px] w-full" /> : children}
    </div>
  );
}

export function AdminClinicaContent({ data }: AdminClinicaContentProps) {
  const [ov, setOv] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-clinica/dashboard/overview")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setOv)
      .catch(() => toast.error("Erro ao carregar dados do dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const tokPct = data.clinica.tokensMensaisDisponiveis > 0
    ? Math.round((data.clinica.tokensConsumidos / data.clinica.tokensMensaisDisponiveis) * 100) : 0;

  const planoLabel: Record<TipoPlano, string> = { BASICO: "Básico", INTERMEDIARIO: "Intermediário", PROFISSIONAL: "Profissional" };
  const statusColor: Record<StatusClinica, { bg: string; text: string; label: string }> = {
    ATIVA: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Ativa" },
    INATIVA: { bg: "bg-slate-100", text: "text-slate-600", label: "Inativa" },
    SUSPENSA: { bg: "bg-amber-50", text: "text-amber-700", label: "Suspensa" },
  };
  const sc = statusColor[data.clinica.status];

  const pieData = ov ? [
    { name: "Agendadas", value: ov.statusBreakdown.agendadas },
    { name: "Confirmadas", value: ov.statusBreakdown.confirmadas },
    { name: "Em Atendimento", value: ov.statusBreakdown.emAtendimento },
    { name: "Realizadas", value: ov.statusBreakdown.realizadas },
  ].filter((d) => d.value > 0) : [];
  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  const doctorData = (ov?.topMedicos ?? []).map((m) => ({
    nome: m.nome.split(" ")[0],
    receita: m.receita,
  }));

  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">

      {/* Header */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800">{data.clinica.nome}</h1>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                {data.clinica.telemedicineHabilitada && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    <Zap className="h-3 w-3" /> Telemedicina
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Plano {planoLabel[data.clinica.plano.nome]} · {data.clinica.email}</p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            {[
              { v: data.estatisticas.totalMedicos, l: "Médicos" },
              { v: data.estatisticas.totalSecretarias, l: "Secretárias" },
              { v: data.estatisticas.totalPacientes, l: "Pacientes" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-8 bg-slate-100" />}
                <div>
                  <p className="text-xl font-bold text-slate-800">{item.v}</p>
                  <p className="text-xs text-slate-400">{item.l}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 border-t border-slate-50 pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500">
              Tokens IA — {data.clinica.tokensConsumidos.toLocaleString("pt-BR")} / {data.clinica.tokensMensaisDisponiveis.toLocaleString("pt-BR")}
            </span>
            <span className={`text-xs font-semibold ${tokPct > 85 ? "text-rose-600" : tokPct > 60 ? "text-amber-600" : "text-indigo-600"}`}>{tokPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div className={`h-1.5 rounded-full transition-all ${tokPct > 85 ? "bg-rose-500" : tokPct > 60 ? "bg-amber-400" : "bg-indigo-500"}`}
              style={{ width: `${Math.min(tokPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards — igual ao original */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard loading={loading} accent="#3b82f6" icon={<FileText />}
          label="Total de Consultas"
          value={loading ? "—" : String(ov?.cards.totalConsultas ?? 0)}
          sub={`${ov?.cards.pagas ?? 0} realizadas (${pct(ov?.cards.pagas ?? 0, ov?.cards.totalConsultas ?? 0)}%)`}
          trend={ov?.cards.variacaoConsultas}
        />
        <KpiCard loading={loading} accent="#f97316" icon={<Clock />}
          label="Consultas Pendentes"
          value={loading ? "—" : String(ov?.cards.pendentes ?? 0)}
          sub={(ov?.cards.vencidas ?? 0) > 0
            ? `${ov?.cards.vencidas} vencidas (${pct(ov?.cards.vencidas ?? 0, ov?.cards.pendentes ?? 0)}%)`
            : "Em andamento"}
        />
        <KpiCard loading={loading} accent="#10b981" icon={<TrendingUp />}
          label="Receita do Mês"
          value={loading ? "—" : formatCurrency(ov?.cards.receitaMes ?? 0)}
          sub="mês atual"
          trend={ov?.cards.variacaoReceita}
        />
        <KpiCard loading={loading} accent="#8b5cf6" icon={<DollarSign />}
          label="Receita Total"
          value={loading ? "—" : formatCurrency(ov?.cards.receitaTotal ?? 0)}
          sub="acumulado"
        />
      </div>

      {/* Charts linha 1: Faturamento + Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Faturamento — Últimos 12 Meses" subtitle="Receita de consultas realizadas" loading={loading} className="lg:col-span-2">
          <ChartContainer config={trendConfig} className="h-[220px] w-full">
            <AreaChart data={ov?.trend ?? []}>
              <defs>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={48}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrency(Number(v)), "Faturamento"]} />} />
              <Area type="monotone" dataKey="faturamento" stroke="#6366f1" strokeWidth={2} fill="url(#fatGrad)" dot={false} />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Consultas por Status" subtitle="Distribuição total acumulada" loading={loading}>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="h-[150px] w-full">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [v, ""]} />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-2 w-full space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      <span className="text-slate-500">{d.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">
                      {d.value} <span className="text-slate-400">({totalPie > 0 ? ((d.value / totalPie) * 100).toFixed(0) : 0}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">Nenhum dado disponível</div>
          )}
        </ChartCard>
      </div>

      {/* Charts linha 2: Top Médicos + Fluxo de Caixa */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top Médicos — Receita do Mês" subtitle="Ranking por faturamento" loading={loading}>
          {doctorData.length > 0 ? (
            <ChartContainer config={{ receita: { label: "Receita", color: "#6366f1" } }} className="h-[220px] w-full">
              <BarChart data={doctorData} layout="vertical" barSize={14}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#475569" }} width={64} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrency(Number(v)), "Receita"]} />} />
                <Bar dataKey="receita" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">Sem atendimentos este mês</div>
          )}
        </ChartCard>

        <ChartCard title="Fluxo de Caixa — Últimos 12 Meses" subtitle="Contas a pagar vs contas a receber" loading={loading}>
          <ChartContainer config={trendConfig} className="h-[220px] w-full">
            <AreaChart data={ov?.trend ?? []}>
              <defs>
                <linearGradient id="crGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={48}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [formatCurrency(Number(v)), n === "contasReceber" ? "A Receber" : "A Pagar"]} />} />
              <Area type="monotone" dataKey="contasReceber" stroke="#10b981" strokeWidth={2} fill="url(#crGrad)" dot={false} />
              <Area type="monotone" dataKey="contasPagar" stroke="#f43f5e" strokeWidth={2} fill="url(#cpGrad)" dot={false} />
            </AreaChart>
          </ChartContainer>
          <div className="mt-3 flex gap-4 justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-4 rounded-full bg-emerald-500 inline-block" /> A Receber
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-4 rounded-full bg-rose-500 inline-block" /> A Pagar
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: "Agendadas", key: "agendadas", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Confirmadas", key: "confirmadas", color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Em Atendimento", key: "emAtendimento", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Realizadas", key: "realizadas", color: "text-emerald-600", bg: "bg-emerald-50" },
        ] as const).map((item) => (
          <div key={item.key} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} ${item.color}`}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            {loading ? <Sk className="h-6 w-12" /> : (
              <p className="text-2xl font-bold text-slate-800">{ov?.statusBreakdown[item.key] ?? 0}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">no total</p>
          </div>
        ))}
      </div>
    </div>
  );
}
