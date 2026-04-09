"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Trash2,
  ShieldCheck,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Solicitacao {
  id: string;
  tipo: string;
  status: string;
  motivo: string | null;
  respostaAdmin: string | null;
  criadoEm: string;
  concluidoEm: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  PENDENTE: {
    label: "Pendente",
    icon: Clock,
    className: "bg-transparent border-amber-500 text-amber-700",
  },
  EM_ANALISE: {
    label: "Em análise",
    icon: AlertTriangle,
    className: "bg-transparent border-blue-500 text-blue-700",
  },
  CONCLUIDA: {
    label: "Concluída",
    icon: CheckCircle,
    className: "bg-transparent border-green-500 text-green-700",
  },
  RECUSADA: {
    label: "Recusada",
    icon: XCircle,
    className: "bg-transparent border-red-500 text-red-700",
  },
};

const TIPO_LABELS: Record<string, string> = {
  EXPORTACAO: "Exportação de dados",
  EXCLUSAO: "Exclusão de dados",
  CORRECAO: "Correção de dados",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DSARSection() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSolicitacoes = useCallback(async () => {
    try {
      const res = await fetch("/api/paciente/dsar");
      if (res.ok) {
        const data = await res.json();
        setSolicitacoes(data.solicitacoes);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolicitacoes();
  }, [fetchSolicitacoes]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/paciente/dsar/exportar");
      if (!res.ok) throw new Error("Erro ao exportar");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] || "meus-dados.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!");
    } catch {
      toast.error("Erro ao exportar seus dados. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/paciente/dsar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "EXCLUSAO", motivo: deleteMotivo }),
      });

      if (res.status === 409) {
        toast.error("Já existe uma solicitação de exclusão em andamento.");
        return;
      }

      if (!res.ok) throw new Error("Erro ao solicitar");

      toast.success("Solicitação de exclusão enviada com sucesso!");
      setShowDeleteDialog(false);
      setDeleteMotivo("");
      fetchSolicitacoes();
    } catch {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingDelete = solicitacoes.some(
    (s) => s.tipo === "EXCLUSAO" && ["PENDENTE", "EM_ANALISE"].includes(s.status)
  );

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Privacidade e Dados (LGPD)
      </p>

      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
              <ShieldCheck className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Seus direitos sobre seus dados
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conforme a LGPD (Art. 18), você pode exportar ou solicitar a exclusão dos seus dados pessoais a qualquer momento.
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Exportar meus dados
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={pendingDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {pendingDelete ? "Exclusão em andamento" : "Solicitar exclusão"}
                </Button>
              </div>

              {/* Lista de solicitações existentes */}
              {!loading && solicitacoes.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Suas solicitações
                  </p>
                  <div className="space-y-2">
                    {solicitacoes.map((s) => {
                      const config = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDENTE;
                      const StatusIcon = config.icon;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {TIPO_LABELS[s.tipo] || s.tipo}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${config.className} text-[10px] py-0 px-1.5 leading-tight`}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {formatDate(s.criadoEm)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar exclusão de dados</DialogTitle>
            <DialogDescription>
              Conforme a LGPD (Art. 18), você tem o direito de solicitar a exclusão dos seus dados pessoais.
              A clínica analisará sua solicitação e poderá manter dados necessários para obrigações legais
              (ex.: prontuário médico deve ser mantido por 20 anos — CFM Resolução nº 1.821/2007).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">
                Motivo (opcional)
              </label>
              <Textarea
                placeholder="Descreva o motivo da sua solicitação..."
                value={deleteMotivo}
                onChange={(e) => setDeleteMotivo(e.target.value)}
                className="mt-1.5 text-sm"
                rows={3}
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Atenção</p>
                  <p className="mt-1">
                    Após a exclusão, seus dados não poderão ser recuperados. Dados de prontuário
                    médico podem ser mantidos conforme exigência legal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Confirmar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
