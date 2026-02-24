"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Pill, Calendar, Stethoscope } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PrescricoesSectionProps {
  prescricoes: Array<{
    id: string;
    posologia: string;
    quantidade: number;
    observacoes: string | null;
    medicamento: {
      nome: string;
      principioAtivo: string | null;
      laboratorio: string | null;
      apresentacao: string | null;
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
    createdAt: string;
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function PrescricoesSection({ prescricoes, expanded, onToggle }: PrescricoesSectionProps) {
  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Prescrições de Medicamentos</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{prescricoes.length} prescrição(ões) realizada(s)</p>
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
              {prescricoes.map((prescricao) => (
                <div
                  key={prescricao.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-800">{prescricao.medicamento.nome}</h4>
                      </div>
                      
                      {prescricao.medicamento.principioAtivo && (
                        <p className="text-xs text-slate-500 mb-2">
                          Princípio Ativo: {prescricao.medicamento.principioAtivo}
                        </p>
                      )}

                      {prescricao.medicamento.laboratorio && (
                        <p className="text-xs text-slate-500 mb-2">
                          Laboratório: {prescricao.medicamento.laboratorio}
                        </p>
                      )}

                      {prescricao.medicamento.apresentacao && (
                        <p className="text-xs text-slate-500 mb-3">
                          Apresentação: {prescricao.medicamento.apresentacao}
                        </p>
                      )}

                      <div className="space-y-2 mt-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Posologia</p>
                          <p className="text-sm text-slate-700">{prescricao.posologia}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Quantidade</p>
                          <p className="text-sm text-slate-700">{prescricao.quantidade} unidade(s)</p>
                        </div>

                        {prescricao.observacoes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5">Observações</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{prescricao.observacoes}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">
                            Prescrito em {formatDate(prescricao.consulta.dataHora ? new Date(prescricao.consulta.dataHora) : null)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Stethoscope className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">
                            {prescricao.consulta.medico.usuario.nome}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
