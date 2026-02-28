"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Database, Download, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SyncStatus {
  status: "idle" | "downloading" | "processing" | "completed" | "error";
  progress: number; // 0-100
  message: string;
  totalProcessed?: number;
  totalInserted?: number;
  totalUpdated?: number;
  totalErrors?: number;
  duration?: number;
  errors?: string[];
}

interface AnvisaSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  onSuccess?: () => void;
}

export function AnvisaSyncDialog({
  open,
  onOpenChange,
  clinicaId,
  onSuccess,
}: AnvisaSyncDialogProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    progress: 0,
    message: "Pronto para sincronizar",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalMedicamentos, setTotalMedicamentos] = useState<number>(0);
  const [processedMedicamentos, setProcessedMedicamentos] = useState<number>(0);

  // Polling para atualizar progresso
  useEffect(() => {
    if (!isSyncing || !open) return;

    const pollProgress = async () => {
      try {
        const response = await fetch("/api/admin-clinica/anvisa/sync");
        if (response.ok) {
          const data = await response.json();
          if (data.inProgress && data.progress) {
            const progress = data.progress;
            setTotalMedicamentos(progress.total);
            setProcessedMedicamentos(progress.processed);
            
            setSyncStatus({
              status: progress.status,
              progress: progress.percentage || 0,
              message: progress.message || "Processando...",
              totalProcessed: progress.total,
              totalInserted: progress.inserted,
              totalUpdated: progress.updated,
              totalErrors: progress.errors,
            });

            // Se ainda está em progresso, continuar polling
            if (progress.status === "processing" || progress.status === "downloading") {
              setTimeout(pollProgress, 1000); // Poll a cada 1 segundo
            } else if (progress.status === "completed" || progress.status === "error") {
              // Sincronização concluída
              setIsSyncing(false);
              
              // Atualizar status final
              setSyncStatus({
                status: progress.status,
                progress: 100,
                message: progress.message || (progress.status === "completed" ? "Sincronização concluída com sucesso!" : "Sincronização concluída com erros"),
                totalProcessed: progress.total,
                totalInserted: progress.inserted,
                totalUpdated: progress.updated,
                totalErrors: progress.errors,
              });
              
              if (progress.status === "completed") {
                setTimeout(() => {
                  if (onSuccess) onSuccess();
                  handleClose();
                }, 2000);
              }
            } else {
              // Status desconhecido, continuar polling
              setTimeout(pollProgress, 1000);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar progresso:", error);
      }
    };

    // Iniciar polling após 500ms
    const timeoutId = setTimeout(pollProgress, 500);
    
    return () => clearTimeout(timeoutId);
  }, [isSyncing, open, onSuccess]);

  const startSync = async () => {
    try {
      setIsSyncing(true);
      setTotalMedicamentos(0);
      setProcessedMedicamentos(0);
      
      setSyncStatus({
        status: "downloading",
        progress: 0,
        message: "Iniciando sincronização...",
      });

      const response = await fetch("/api/admin-clinica/anvisa/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao sincronizar");
      }

      // A resposta inicial não tem dados completos, o polling vai atualizar
      const result = await response.json();

      if (!result.success) {
        setSyncStatus({
          status: "error",
          progress: 0,
          message: result.message || "Sincronização concluída com erros",
          totalProcessed: result.result?.totalProcessed,
          totalInserted: result.result?.totalInserted,
          totalUpdated: result.result?.totalUpdated,
          totalErrors: result.result?.totalErrors,
          duration: result.result?.duration,
          errors: result.result?.errors || [],
        });
        setIsSyncing(false);
      }
    } catch (error) {
      setSyncStatus({
        status: "error",
        progress: 0,
        message:
          error instanceof Error ? error.message : "Erro desconhecido ao sincronizar",
      });
      setIsSyncing(false);
    }
  };

  const handleClose = () => {
    if (!isSyncing) {
      setSyncStatus({
        status: "idle",
        progress: 0,
        message: "Pronto para sincronizar",
      });
      onOpenChange(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case "idle":
        return <Database className="h-5 w-5 text-muted-foreground" />;
      case "downloading":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case "completed":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      default:
        return "bg-primary";
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronização com Base ANVISA
          </DialogTitle>
          <DialogDescription>
            Sincronize os medicamentos da base oficial da ANVISA. Este processo
            pode levar alguns minutos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status atual */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium">{syncStatus.message}</p>
              {syncStatus.status === "downloading" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Baixando arquivo CSV da ANVISA...
                </p>
              )}
              {syncStatus.status === "processing" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Processando e atualizando banco de dados...
                </p>
              )}
            </div>
          </div>

          {/* Barra de progresso */}
          {syncStatus.status !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {totalMedicamentos > 0 
                    ? `Processando: ${processedMedicamentos.toLocaleString("pt-BR")} de ${totalMedicamentos.toLocaleString("pt-BR")} medicamentos`
                    : "Progresso"}
                </span>
                <span className="font-medium">{syncStatus.progress}%</span>
              </div>
              <Progress
                value={syncStatus.progress}
                className={`h-2 ${
                  syncStatus.status === "completed"
                    ? "[&>div]:bg-green-600"
                    : syncStatus.status === "error"
                    ? "[&>div]:bg-red-600"
                    : ""
                }`}
              />
              {totalMedicamentos > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {processedMedicamentos.toLocaleString("pt-BR")} / {totalMedicamentos.toLocaleString("pt-BR")} medicamentos processados
                </p>
              )}
            </div>
          )}

          {/* Estatísticas */}
          {syncStatus.status === "completed" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div>
                <p className="text-xs text-muted-foreground">Processados</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {syncStatus.totalProcessed?.toLocaleString("pt-BR") || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inseridos</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {syncStatus.totalInserted?.toLocaleString("pt-BR") || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizados</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {syncStatus.totalUpdated?.toLocaleString("pt-BR") || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {formatDuration(syncStatus.duration)}
                </p>
              </div>
            </div>
          )}

          {/* Erros */}
          {syncStatus.status === "error" && syncStatus.totalErrors && syncStatus.totalErrors > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {syncStatus.totalErrors} erro(s) encontrado(s)
                </p>
                {syncStatus.errors && syncStatus.errors.length > 0 && (
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {syncStatus.errors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-muted-foreground">
                        • {error}
                      </p>
                    ))}
                    {syncStatus.errors.length > 5 && (
                      <p className="text-muted-foreground italic">
                        ... e mais {syncStatus.errors.length - 5} erro(s)
                      </p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Informações */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1 text-xs text-blue-900 dark:text-blue-300">
                <p className="font-medium mb-1">Sobre a sincronização:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Os dados são obtidos diretamente da ANVISA</li>
                  <li>Medicamentos existentes serão atualizados</li>
                  <li>Novos medicamentos serão adicionados automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSyncing}
          >
            {syncStatus.status === "completed" ? "Fechar" : "Cancelar"}
          </Button>
          {syncStatus.status === "idle" && (
            <Button onClick={startSync} disabled={isSyncing}>
              <Download className="mr-2 h-4 w-4" />
              Iniciar Sincronização
            </Button>
          )}
          {syncStatus.status === "completed" && (
            <Button onClick={startSync} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Novamente
            </Button>
          )}
          {syncStatus.status === "error" && (
            <Button onClick={startSync}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
