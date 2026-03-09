"use client";

import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import { FileText, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Estatisticas {
  totalPagamentos: number;
  pagamentosPendentes: number;
  pagamentosPagos: number;
  pagamentosVencidos: number;
  receitaMesAtual: number;
  receitaTotal: number;
  receitaParticular: number;
  receitaConvenios: number;
  retornos: number;
}

interface PagamentosCardsProps {
  estatisticas: Estatisticas;
}

export function PagamentosCards({ estatisticas }: PagamentosCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Card 1: Receita Particular */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Particular
              </p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaParticular || 0)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="size-4 text-blue-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Card 2: Receita Convênios */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Convênios
              </p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaConvenios || 0)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-4 text-green-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Card 3: Retornos */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Retornos
              </p>
              <p className="text-xl font-bold text-slate-800">
                {estatisticas.retornos || 0}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="size-4 text-orange-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Card 4: Receita Total */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Total
              </p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaTotal || 0)}
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















