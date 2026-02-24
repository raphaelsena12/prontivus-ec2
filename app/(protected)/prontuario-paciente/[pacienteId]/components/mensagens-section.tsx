"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, MessageSquare, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface MensagensSectionProps {
  mensagens: Array<{
    id: string;
    conteudo: string;
    enviadoPorMedico: boolean;
    lida: boolean;
    dataLeitura: string | null;
    createdAt: string;
    medico: {
      usuario: {
        nome: string;
      };
    };
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function MensagensSection({ mensagens, expanded, onToggle }: MensagensSectionProps) {
  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Mensagens</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{mensagens.length} mensagem(ns) trocada(s)</p>
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
              {mensagens.map((mensagem) => (
                <div
                  key={mensagem.id}
                  className={`border rounded-lg p-4 ${
                    mensagem.enviadoPorMedico
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {mensagem.enviadoPorMedico && (
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                          Médico
                        </Badge>
                      )}
                      {!mensagem.enviadoPorMedico && (
                        <Badge variant="outline" className="text-xs">
                          Paciente
                        </Badge>
                      )}
                      {mensagem.lida && (
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                          Lida
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(mensagem.createdAt ? new Date(mensagem.createdAt) : null)}
                    </div>
                  </div>

                  {mensagem.enviadoPorMedico && (
                    <div className="text-xs text-slate-600 mb-2">
                      {mensagem.medico.usuario.nome}
                    </div>
                  )}

                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{mensagem.conteudo}</p>

                  {mensagem.dataLeitura && (
                    <div className="text-xs text-slate-500 mt-2">
                      Lida em {formatDate(mensagem.dataLeitura ? new Date(mensagem.dataLeitura) : null)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
