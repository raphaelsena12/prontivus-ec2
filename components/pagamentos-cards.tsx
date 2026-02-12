"use client";

import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import { FileText, Clock, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Estatisticas {
  totalPagamentos: number;
  pagamentosPendentes: number;
  pagamentosPagos: number;
  pagamentosVencidos: number;
  receitaMesAtual: number;
  receitaTotal: number;
}

interface PagamentosCardsProps {
  estatisticas: Estatisticas;
}

export function PagamentosCards({ estatisticas }: PagamentosCardsProps) {
  const percentualPagos =
    estatisticas.totalPagamentos > 0
      ? ((estatisticas.pagamentosPagos / estatisticas.totalPagamentos) * 100).toFixed(1)
      : "0";

  const percentualVencidos =
    estatisticas.pagamentosPendentes > 0
      ? ((estatisticas.pagamentosVencidos / estatisticas.pagamentosPendentes) * 100).toFixed(1)
      : "0";

  return (
    <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Total de Pagamentos
              </p>
              <p className="text-xl font-bold text-slate-800">
                {estatisticas.totalPagamentos}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <IconTrendingUp className="size-3" />
                <span>{estatisticas.pagamentosPagos} pagos ({percentualPagos}%)</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="size-4 text-blue-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Pagamentos Pendentes
              </p>
              <p className="text-xl font-bold text-slate-800">
                {estatisticas.pagamentosPendentes}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-xs ${estatisticas.pagamentosVencidos > 0 ? "text-red-600" : "text-orange-600"}`}>
                {estatisticas.pagamentosVencidos > 0 ? (
                  <>
                    <IconTrendingDown className="size-3" />
                    <span>{estatisticas.pagamentosVencidos} vencidos ({percentualVencidos}%)</span>
                  </>
                ) : (
                  <>
                    <Clock className="size-3" />
                    <span>Em andamento</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="size-4 text-orange-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita do Mês
              </p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaMesAtual)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <IconTrendingUp className="size-3" />
                <span>Mês atual</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-4 text-green-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Total
              </p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaTotal)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="size-4 text-purple-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}















