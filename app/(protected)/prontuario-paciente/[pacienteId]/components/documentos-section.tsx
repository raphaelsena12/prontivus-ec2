"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, FileCheck, Calendar, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface DocumentosSectionProps {
  documentos: Array<{
    id: string;
    tipoDocumento: string;
    nomeDocumento: string;
    s3Key: string | null;
    createdAt: string;
    consulta: {
      id: string;
      dataHora: string;
    };
    medico: {
      usuario: {
        nome: string;
      };
    };
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function DocumentosSection({ documentos, expanded, onToggle }: DocumentosSectionProps) {
  const getTipoDocumentoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'receita-medica': 'Receita Médica',
      'atestado-afastamento': 'Atestado de Afastamento',
      'atestado-medico': 'Atestado Médico',
      'declaracao': 'Declaração',
      'prontuario': 'Prontuário',
      'exame-imagem': 'Exame de Imagem',
      'exame-pdf': 'Exame PDF',
    };
    return tipos[tipo] || tipo;
  };

  const handleDownload = async (documento: typeof documentos[0]) => {
    if (!documento.s3Key) {
      toast.error("Documento não disponível para download");
      return;
    }

    try {
      // TODO: Implementar download do S3
      toast.info("Funcionalidade de download em desenvolvimento");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do documento");
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <FileCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Documentos Gerados</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{documentos.length} documento(s) gerado(s)</p>
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
              {documentos.map((documento) => (
                <div
                  key={documento.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-800">{documento.nomeDocumento}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getTipoDocumentoLabel(documento.tipoDocumento)}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">
                            Gerado em {formatDate(documento.createdAt ? new Date(documento.createdAt) : null)}
                          </span>
                        </div>

                        <div className="text-sm text-slate-600">
                          Consulta: {formatDate(documento.consulta.dataHora ? new Date(documento.consulta.dataHora) : null)}
                        </div>

                        <div className="text-sm text-slate-600">
                          Médico: {documento.medico.usuario.nome}
                        </div>
                      </div>
                    </div>
                  </div>

                  {documento.s3Key && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => handleDownload(documento)}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
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
