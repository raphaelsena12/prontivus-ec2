"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Calendar, Stethoscope, Eye } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface HistoricoConsultasSectionProps {
  consultas: Array<{
    id: string;
    dataHora: string;
    status: string;
    tipoConsulta: {
      nome: string;
    } | null;
    medico: {
      usuario: {
        nome: string;
      };
    };
    codigoTuss: {
      codigoTuss: string;
      descricao: string;
    } | null;
    valorCobrado: number | string | null;
    prontuarios?: Array<{
      id: string;
      diagnostico: string | null;
      createdAt: string;
    }>;
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function HistoricoConsultasSection({ consultas, expanded, onToggle }: HistoricoConsultasSectionProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      AGENDADA: { label: "Agendada", variant: "outline" },
      CONFIRMADA: { label: "Confirmada", variant: "default" },
      EM_ATENDIMENTO: { label: "Em Atendimento", variant: "default" },
      REALIZADA: { label: "Realizada", variant: "default" },
      CANCELADA: { label: "Cancelada", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "outline" };
  };

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Histórico de Consultas</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{consultas.length} consulta(s) realizada(s)</p>
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
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {consultas.map((consulta) => {
                const statusInfo = getStatusBadge(consulta.status);
                const prontuario = consulta.prontuarios?.[0];

                return (
                  <div
                    key={consulta.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                          {consulta.tipoConsulta && (
                            <Badge variant="outline" className="text-xs">
                              {consulta.tipoConsulta.nome}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {formatDate(consulta.dataHora ? new Date(consulta.dataHora) : null)} às {formatTime(consulta.dataHora)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Stethoscope className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">{consulta.medico.usuario.nome}</span>
                          </div>

                          {consulta.codigoTuss && (
                            <div className="text-xs text-slate-500 mt-1">
                              {consulta.codigoTuss.codigoTuss} - {consulta.codigoTuss.descricao}
                            </div>
                          )}

                          {consulta.valorCobrado && (
                            <div className="text-sm text-slate-600 mt-1">
                              Valor: R$ {Number(consulta.valorCobrado).toFixed(2).replace('.', ',')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {prontuario?.diagnostico && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Diagnóstico:</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{prontuario.diagnostico}</p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
