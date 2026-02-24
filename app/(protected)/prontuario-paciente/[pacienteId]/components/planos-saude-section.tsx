"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Building2, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PlanosSaudeSectionProps {
  planosSaude: Array<{
    id: string;
    numeroCarteirinha: string;
    dataInicio: string;
    dataFim: string | null;
    titular: boolean;
    ativo: boolean;
    planoSaude: {
      nome: string;
      tipoPlano: string;
      operadora: {
        nomeFantasia: string | null;
        razaoSocial: string;
      };
    };
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function PlanosSaudeSection({ planosSaude, expanded, onToggle }: PlanosSaudeSectionProps) {
  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Planos de Saúde</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{planosSaude.length} plano(s) cadastrado(s)</p>
          </div>
        </div>
      {onToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      )}
      </CardHeader>
      {expanded && (
        <CardContent className="p-5">
          <div className="space-y-4">
            {planosSaude.map((plano) => (
              <div
                key={plano.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-800">{plano.planoSaude.nome}</h4>
                      {plano.ativo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          Inativo
                        </Badge>
                      )}
                      {plano.titular && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Titular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {plano.planoSaude.operadora.nomeFantasia || plano.planoSaude.operadora.razaoSocial}
                    </p>
                    {plano.planoSaude.tipoPlano && (
                      <p className="text-xs text-slate-500 mt-1">Tipo: {plano.planoSaude.tipoPlano}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Nº Carteirinha</p>
                      <p className="text-sm font-medium text-slate-800">{plano.numeroCarteirinha}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Período</p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(plano.dataInicio ? new Date(plano.dataInicio) : null)}
                        {plano.dataFim && ` até ${formatDate(plano.dataFim ? new Date(plano.dataFim) : null)}`}
                        {!plano.dataFim && ' (sem término)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
