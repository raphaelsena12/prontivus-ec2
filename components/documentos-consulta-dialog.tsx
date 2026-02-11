"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Eye, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Documento {
  id: string;
  tipoDocumento: string;
  nomeDocumento: string;
  s3Key: string | null;
  createdAt: string;
}

interface DocumentosConsultaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultaId: string;
  consultaData?: string;
}

export function DocumentosConsultaDialog({
  isOpen,
  onClose,
  consultaId,
  consultaData,
}: DocumentosConsultaDialogProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && consultaId) {
      fetchDocumentos();
    }
  }, [isOpen, consultaId]);

  const fetchDocumentos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medico/consultas/${consultaId}/documentos`);
      if (!response.ok) {
        throw new Error("Erro ao buscar documentos");
      }
      const data = await response.json();
      setDocumentos(data.documentos || []);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (documento: Documento) => {
    if (!documento.s3Key) {
      toast.error("Documento não disponível no S3");
      return;
    }

    setLoadingUrl(documento.id);
    try {
      const response = await fetch(`/api/medico/documentos/${documento.id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao buscar documento");
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL do documento não encontrada");
      }
    } catch (error: any) {
      console.error("Erro ao visualizar documento:", error);
      toast.error(error.message || "Erro ao visualizar documento");
    } finally {
      setLoadingUrl(null);
    }
  };

  const getDocumentIcon = (tipoDocumento: string) => {
    return FileText;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">
            Documentos da Consulta
          </DialogTitle>
          {consultaData && (
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(new Date(consultaData))}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500 font-medium">Nenhum documento encontrado</p>
              <p className="text-xs text-slate-400 mt-1">
                Esta consulta não possui documentos gerados
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {documentos.map((documento) => {
                const Icon = getDocumentIcon(documento.tipoDocumento);
                const dataCriacao = new Date(documento.createdAt);

                return (
                  <div
                    key={documento.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {documento.nomeDocumento}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {formatDate(dataCriacao)} às {dataCriacao.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => handleViewDocument(documento)}
                        disabled={loadingUrl === documento.id || !documento.s3Key}
                        title="Visualizar PDF"
                      >
                        {loadingUrl === documento.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="text-sm">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

