"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, ClipboardList, Calendar, Stethoscope } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ExamesSectionProps {
  solicitacoesExames: Array<{
    id: string;
    status: string;
    dataSolicitacao: string;
    dataRealizacao: string | null;
    resultado: string | null;
    observacoes: string | null;
    exame: {
      nome: string;
      tipo: string | null;
      descricao: string | null;
    };
    consulta: {
      id: string;
      dataHora: string;
      medico: {
        usuario: {
          nome: string;
        };
      };
    };
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function ExamesSection({ solicitacoesExames, expanded, onToggle }: ExamesSectionProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      SOLICITADO: { label: "Solicitado", variant: "outline" },
      REALIZADO: { label: "Realizado", variant: "default" },
      CANCELADO: { label: "Cancelado", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "outline" };
  };

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Exames</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{solicitacoesExames.length} exame(s) solicitado(s)</p>
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
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {solicitacoesExames.map((solicitacao) => {
                const statusInfo = getStatusBadge(solicitacao.status);

                return (
                  <div
                    key={solicitacao.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-800">{solicitacao.exame.nome}</h4>
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        {solicitacao.exame.tipo && (
                          <p className="text-xs text-slate-500 mb-2">Tipo: {solicitacao.exame.tipo}</p>
                        )}

                        {solicitacao.exame.descricao && (
                          <p className="text-sm text-slate-600 mb-3">{solicitacao.exame.descricao}</p>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              Solicitado em {formatDate(solicitacao.dataSolicitacao ? new Date(solicitacao.dataSolicitacao) : null)}
                            </span>
                          </div>
                          
                          {solicitacao.dataRealizacao && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600">
                                Realizado em {formatDate(solicitacao.dataRealizacao ? new Date(solicitacao.dataRealizacao) : null)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <Stethoscope className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {solicitacao.consulta.medico.usuario.nome}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {solicitacao.resultado && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Resultado</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{solicitacao.resultado}</p>
                      </div>
                    )}

                    {solicitacao.observacoes && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{solicitacao.observacoes}</p>
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
