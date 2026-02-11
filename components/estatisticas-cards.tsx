"use client";

import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import { Building2, Users, DollarSign, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Estatisticas {
  totalClinicas: number;
  totalUsuarios: number;
  receitaMensal: number;
  receitaTotal: number;
}

interface EstatisticasCardsProps {
  estatisticas: Estatisticas;
}

export function EstatisticasCards({ estatisticas }: EstatisticasCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total de Clínicas */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Total de Clínicas
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {estatisticas.totalClinicas}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <ArrowUp className="size-3" />
                <span>12% Desde o mês passado</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Building2 className="size-6 text-red-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Total de Usuários */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Total de Usuários
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {estatisticas.totalUsuarios}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                <ArrowDown className="size-3" />
                <span>16% Desde o mês passado</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="size-6 text-green-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Receita Mensal */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Mensal
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaMensal)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <ArrowUp className="size-3" />
                <span>8% Desde o mês passado</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="size-6 text-orange-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Receita Total */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Receita Total
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(estatisticas.receitaTotal)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="size-6 text-purple-600" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}





