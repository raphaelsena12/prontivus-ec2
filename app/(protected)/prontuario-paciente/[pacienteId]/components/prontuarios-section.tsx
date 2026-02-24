"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, FileText, Calendar, Stethoscope, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ProntuariosSectionProps {
  prontuarios: Array<{
    id: string;
    anamnese: string | null;
    exameFisico: string | null;
    diagnostico: string | null;
    conduta: string | null;
    evolucao: string | null;
    createdAt: string;
    medico: {
      usuario: {
        nome: string;
      };
    };
    consulta: {
      id: string;
      dataHora: string;
      tipoConsulta: {
        nome: string;
      } | null;
    } | null;
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function ProntuariosSection({ prontuarios, expanded, onToggle }: ProntuariosSectionProps) {
  const router = useRouter();

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Prontuários Médicos</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{prontuarios.length} prontuário(s) registrado(s)</p>
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
            <div className="space-y-4">
              {prontuarios.map((prontuario) => (
                <div
                  key={prontuario.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {prontuario.consulta?.tipoConsulta && (
                          <Badge variant="outline" className="text-xs">
                            {prontuario.consulta.tipoConsulta.nome}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {prontuario.consulta && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {formatDate(prontuario.consulta.dataHora ? new Date(prontuario.consulta.dataHora) : null)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Stethoscope className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{prontuario.medico.usuario.nome}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>Registrado em {formatDate(prontuario.createdAt ? new Date(prontuario.createdAt) : null)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4 pt-3 border-t border-slate-100">
                    {prontuario.anamnese && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Anamnese</p>
                        <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">
                          {prontuario.anamnese}
                        </p>
                      </div>
                    )}

                    {prontuario.exameFisico && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Exame Físico</p>
                        <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">
                          {prontuario.exameFisico}
                        </p>
                      </div>
                    )}

                    {prontuario.diagnostico && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Diagnóstico</p>
                        <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">
                          {prontuario.diagnostico}
                        </p>
                      </div>
                    )}

                    {prontuario.conduta && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Conduta</p>
                        <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">
                          {prontuario.conduta}
                        </p>
                      </div>
                    )}

                    {prontuario.evolucao && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Evolução</p>
                        <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">
                          {prontuario.evolucao}
                        </p>
                      </div>
                    )}
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
