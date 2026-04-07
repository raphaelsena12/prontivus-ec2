"use client";

import { brazilToday } from "@/lib/timezone-utils";
import { useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  TrendingUp,
  ShoppingCart,
  Stethoscope,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";

type TipoRelatorio =
  | "faturamento"
  | "vendas"
  | "faturamento-medico"
  | "estoque"
  | "contas-pagar"
  | "contas-receber";

interface RelatorioContentProps {
  tipo: TipoRelatorio;
  clinicaId: string;
}

const META: Record<TipoRelatorio, { titulo: string; subtitulo: string; icon: LucideIcon }> = {
  faturamento: {
    titulo: "Relatório de Faturamento",
    subtitulo: "Receitas geradas pela clínica no período selecionado",
    icon: TrendingUp,
  },
  vendas: {
    titulo: "Relatório de Vendas",
    subtitulo: "Consultas e procedimentos por status e convênio",
    icon: ShoppingCart,
  },
  "faturamento-medico": {
    titulo: "Relatório de Faturamento por Médico",
    subtitulo: "Breakdown de faturamento e repasse por médico",
    icon: Stethoscope,
  },
  estoque: {
    titulo: "Relatório de Estoque",
    subtitulo: "Movimentação de medicamentos e insumos no período",
    icon: Package,
  },
  "contas-pagar": {
    titulo: "Relatório de Contas a Pagar",
    subtitulo: "Listagem de contas a pagar com totais e status",
    icon: ArrowDownCircle,
  },
  "contas-receber": {
    titulo: "Relatório de Contas a Receber",
    subtitulo: "Listagem de contas a receber com totais e status",
    icon: ArrowUpCircle,
  },
};

/** Formata Date para "YYYY-MM-DD" no fuso de Brasília */
function toLocalISO(_d?: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(_d ?? new Date());
}

function getDefaultDates() {
  const hoje = brazilToday();
  const [y, m] = hoje.split("-").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1 - 2, 1));
  return { inicio: toLocalISO(inicio), fim: hoje };
}

const QUICK_RANGES = [
  { key: "hoje", label: "Hoje" },
  { key: "mes", label: "Este mês" },
  { key: "mes-anterior", label: "Mês anterior" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Este ano" },
] as const;

export function RelatorioContent({ tipo }: RelatorioContentProps) {
  const meta = META[tipo];
  const Icon = meta.icon;

  const defaults = getDefaultDates();
  const [dataInicio, setDataInicio] = useState(defaults.inicio);
  const [dataFim, setDataFim] = useState(defaults.fim);
  const [loading, setLoading] = useState(false);

  const setQuickRange = (range: (typeof QUICK_RANGES)[number]["key"]) => {
    const hoje = brazilToday();
    const [y, m] = hoje.split("-").map(Number);
    switch (range) {
      case "hoje":
        setDataInicio(hoje);
        setDataFim(hoje);
        break;
      case "mes":
        setDataInicio(`${y}-${String(m).padStart(2, "0")}-01`);
        setDataFim(hoje);
        break;
      case "mes-anterior": {
        const iniDate = new Date(Date.UTC(y, m - 2, 1));
        const fimDate = new Date(Date.UTC(y, m - 1, 0));
        setDataInicio(toLocalISO(iniDate));
        setDataFim(toLocalISO(fimDate));
        break;
      }
      case "trimestre":
        setDataInicio(toLocalISO(new Date(Date.UTC(y, m - 4, 1))));
        setDataFim(hoje);
        break;
      case "ano":
        setDataInicio(`${y}-01-01`);
        setDataFim(hoje);
        break;
    }
  };

  const handleGerar = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Selecione o período do relatório");
      return;
    }
    if (dataInicio > dataFim) {
      toast.error("Data inicial não pode ser maior que a data final");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin-clinica/relatorios/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, dataInicio, dataFim }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar relatório");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6 gap-4">
      <PageHeader icon={Icon} title={meta.titulo} subtitle={meta.subtitulo} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Período</h2>
        </div>

        {/* Quick ranges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_RANGES.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setQuickRange(opt.key)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors font-medium disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 font-medium">Data Inicial</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={loading}
              className="h-9 text-sm border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 font-medium">Data Final</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              disabled={loading}
              className="h-9 text-sm border-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGerar}
            disabled={loading}
            className="gap-2 bg-slate-800 hover:bg-slate-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {loading ? "Gerando relatório..." : "Gerar Relatório"}
          </Button>
        </div>
      </div>
    </div>
  );
}
