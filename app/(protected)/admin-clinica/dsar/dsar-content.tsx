"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { maskCPF } from "@/lib/utils";
import { toast } from "sonner";

interface Solicitacao {
  id: string;
  pacienteId: string;
  tipo: string;
  status: string;
  motivo: string | null;
  respostaAdmin: string | null;
  adminId: string | null;
  criadoEm: string;
  analisadoEm: string | null;
  concluidoEm: string | null;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    email: string | null;
  };
}

interface Stats {
  total: number;
  pendentes: number;
  emAnalise: number;
  concluidas: number;
  recusadas: number;
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

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DSARContent() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pendentes: 0,
    emAnalise: 0,
    concluidas: 0,
    recusadas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Dialog de ação
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [actionResposta, setActionResposta] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (tipoFilter !== "todos") params.set("tipo", tipoFilter);

      const res = await fetch(`/api/admin-clinica/dsar?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar solicitações");

      const data = await res.json();
      setSolicitacoes(data.solicitacoes);
      setStats(data.stats);
    } catch {
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tipoFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, tipoFilter]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(solicitacoes.length / pagination.pageSize)),
    [solicitacoes.length, pagination.pageSize]
  );

  const paged = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return solicitacoes.slice(start, start + pagination.pageSize);
  }, [solicitacoes, pagination.pageIndex, pagination.pageSize]);

  const openAction = (solicitacao: Solicitacao, status: string) => {
    setSelectedSolicitacao(solicitacao);
    setActionStatus(status);
    setActionResposta("");
    setActionDialog(true);
  };

  const handleAction = async () => {
    if (!selectedSolicitacao) return;
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin-clinica/dsar/${selectedSolicitacao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionStatus,
          respostaAdmin: actionResposta || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar");
      }

      const STATUS_ACTION_LABELS: Record<string, string> = {
        EM_ANALISE: "movida para análise",
        CONCLUIDA: "concluída",
        RECUSADA: "recusada",
      };

      toast.success(`Solicitação ${STATUS_ACTION_LABELS[actionStatus] || "atualizada"} com sucesso!`);
      setActionDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar solicitação");
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title="Solicitações DSAR"
        subtitle="Gerencie as solicitações de direitos dos titulares (LGPD Art. 18)"
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em análise</p>
            <p className="text-2xl font-bold text-blue-600">{stats.emAnalise}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">{stats.concluidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recusadas</p>
            <p className="text-2xl font-bold text-red-600">{stats.recusadas}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Solicitações</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                <SelectItem value="EM_ANALISE">Em análise</SelectItem>
                <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
                <SelectItem value="RECUSADA">Recusadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-36 h-8 text-xs bg-background">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="EXPORTACAO">Exportação</SelectItem>
                <SelectItem value="EXCLUSAO">Exclusão</SelectItem>
                <SelectItem value="CORRECAO">Correção</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="h-8 w-8 p-0"
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                      <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Data</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Motivo</TableHead>
                      <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((s) => {
                      const config = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDENTE;
                      const StatusIcon = config.icon;
                      const canAnalyze = s.status === "PENDENTE";
                      const canConclude = ["PENDENTE", "EM_ANALISE"].includes(s.status);

                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs py-3 font-medium">
                            {s.paciente.nome}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {maskCPF(s.paciente.cpf)}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {TIPO_LABELS[s.tipo] || s.tipo}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <Badge
                              variant="outline"
                              className={`${config.className} text-[10px] py-0.5 px-1.5 leading-tight`}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {formatDateTime(s.criadoEm)}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground max-w-[200px] truncate">
                            {s.motivo || "-"}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canAnalyze && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] px-2"
                                  onClick={() => openAction(s, "EM_ANALISE")}
                                >
                                  Analisar
                                </Button>
                              )}
                              {canConclude && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    onClick={() => openAction(s, "CONCLUIDA")}
                                  >
                                    Concluir
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={() => openAction(s, "RECUSADA")}
                                  >
                                    Recusar
                                  </Button>
                                </>
                              )}
                              {!canAnalyze && !canConclude && s.respostaAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px] px-2"
                                  onClick={() => {
                                    setSelectedSolicitacao(s);
                                    setActionDialog(true);
                                    setActionStatus("");
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver resposta
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between px-6 pb-6">
                <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
                  {solicitacoes.length} solicitação(ões) encontrada(s).
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="rows-per-page" className="text-xs font-medium">
                      Linhas por página
                    </Label>
                    <Select
                      value={`${pagination.pageSize}`}
                      onValueChange={(value) => {
                        setPagination({ pageIndex: 0, pageSize: Number(value) });
                      }}
                    >
                      <SelectTrigger size="sm" className="w-20 h-7 text-xs" id="rows-per-page">
                        <SelectValue placeholder={pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-fit items-center justify-center text-xs font-medium">
                    Página {pagination.pageIndex + 1} de {pageCount}
                  </div>
                  <div className="ml-auto flex items-center gap-2 lg:ml-0">
                    <Button
                      variant="outline"
                      className="hidden h-7 w-7 p-0 lg:flex text-xs"
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                      disabled={pagination.pageIndex === 0}
                    >
                      <span className="sr-only">Primeira página</span>
                      <IconChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-7 w-7 text-xs"
                      size="icon"
                      onClick={() =>
                        setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))
                      }
                      disabled={pagination.pageIndex === 0}
                    >
                      <span className="sr-only">Página anterior</span>
                      <IconChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-7 w-7 text-xs"
                      size="icon"
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          pageIndex: Math.min(pageCount - 1, p.pageIndex + 1),
                        }))
                      }
                      disabled={pagination.pageIndex >= pageCount - 1}
                    >
                      <span className="sr-only">Próxima página</span>
                      <IconChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="hidden h-7 w-7 lg:flex text-xs"
                      size="icon"
                      onClick={() =>
                        setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))
                      }
                      disabled={pagination.pageIndex >= pageCount - 1}
                    >
                      <span className="sr-only">Última página</span>
                      <IconChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de ação */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionStatus === ""
                ? "Detalhes da solicitação"
                : actionStatus === "EM_ANALISE"
                ? "Iniciar análise"
                : actionStatus === "CONCLUIDA"
                ? "Concluir solicitação"
                : "Recusar solicitação"}
            </DialogTitle>
            {selectedSolicitacao && (
              <DialogDescription>
                {TIPO_LABELS[selectedSolicitacao.tipo]} — Paciente:{" "}
                {selectedSolicitacao.paciente.nome}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedSolicitacao && (
            <div className="space-y-3">
              {selectedSolicitacao.motivo && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Motivo do paciente
                  </label>
                  <p className="text-sm mt-1 bg-muted/50 rounded-md p-3">
                    {selectedSolicitacao.motivo}
                  </p>
                </div>
              )}

              {/* Modo visualização (já concluída/recusada) */}
              {actionStatus === "" && selectedSolicitacao.respostaAdmin && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Resposta do administrador
                  </label>
                  <p className="text-sm mt-1 bg-muted/50 rounded-md p-3">
                    {selectedSolicitacao.respostaAdmin}
                  </p>
                </div>
              )}

              {/* Modo ação */}
              {actionStatus !== "" && (
                <div>
                  <label className="text-sm font-medium">
                    Resposta / Justificativa {actionStatus === "RECUSADA" ? "(obrigatório)" : "(opcional)"}
                  </label>
                  <Textarea
                    placeholder={
                      actionStatus === "RECUSADA"
                        ? "Justifique o motivo da recusa..."
                        : "Observações sobre a resolução..."
                    }
                    value={actionResposta}
                    onChange={(e) => setActionResposta(e.target.value)}
                    className="mt-1.5 text-sm"
                    rows={3}
                  />
                </div>
              )}

              {actionStatus === "RECUSADA" && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      A recusa deve ser fundamentada conforme a LGPD. Dados de prontuário médico
                      podem ser mantidos por exigência legal (CFM Resolução nº 1.821/2007).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(false)} disabled={actionSubmitting}>
              {actionStatus === "" ? "Fechar" : "Cancelar"}
            </Button>
            {actionStatus !== "" && (
              <Button
                variant={actionStatus === "RECUSADA" ? "destructive" : "default"}
                onClick={handleAction}
                disabled={actionSubmitting || (actionStatus === "RECUSADA" && !actionResposta.trim())}
              >
                {actionSubmitting && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
                {actionStatus === "EM_ANALISE"
                  ? "Iniciar análise"
                  : actionStatus === "CONCLUIDA"
                  ? "Concluir"
                  : "Recusar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
