"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Shield, Search, RefreshCw, Info, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { formatAuditDetails } from "@/lib/audit-log-format";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userTipo: string;
  clinicaId: string | null;
  clinicaNome: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  VIEW: { label: "Visualizar", variant: "secondary" },
  CREATE: { label: "Criar", variant: "default" },
  UPDATE: { label: "Atualizar", variant: "outline" },
  DELETE: { label: "Excluir", variant: "destructive" },
  EXPORT: { label: "Exportar", variant: "outline" },
  LOGIN: { label: "Login", variant: "secondary" },
  LOGOUT: { label: "Logout", variant: "secondary" },
  ACCESS_DENIED: { label: "Acesso Negado", variant: "destructive" },
  // IA clínica
  "process-transcription": { label: "IA: Processar transcrição", variant: "default" },
  "anamnese-stream": { label: "IA: Anamnese (stream)", variant: "default" },
  "generate-anamnese": { label: "IA: Gerar anamnese", variant: "default" },
  "analisar-exames": { label: "IA: Analisar exames", variant: "default" },
  "analisar-exame-detalhado": { label: "IA: Exame detalhado", variant: "default" },
  "resumo-clinico": { label: "IA: Resumo clínico", variant: "default" },
  "resumo-paciente": { label: "IA: Resumo paciente", variant: "default" },
  "sugerir-prescricao": { label: "IA: Sugerir prescrição", variant: "default" },
};

const RESOURCE_LABELS: Record<string, string> = {
  Prontuario: "Prontuário",
  Paciente: "Paciente",
  Consulta: "Consulta",
  Prescricao: "Prescrição",
  Exame: "Exame",
  Documento: "Documento",
  Usuario: "Usuário",
  ClinicalRoute: "Rota Clínica",
  clinical_ai: "IA Clínica",
};

const TIPO_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_CLINICA: "Admin",
  MEDICO: "Médico",
  SECRETARIA: "Secretária",
  PACIENTE: "Paciente",
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function DetailDialog({ details, action, resource }: { details: Record<string, any>; action: string; resource: string }) {
  const camposAlterados = details.camposAlterados as Record<string, { de: unknown; para: unknown }> | null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-3.5 w-3.5 text-blue-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Detalhes - {ACTION_LABELS[action]?.label || action} {RESOURCE_LABELS[resource] || resource}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {/* Bloco de IA clínica */}
          {resource === "clinical_ai" && (
            <div className="space-y-1.5 rounded border bg-blue-50/40 p-3">
              <div className="font-medium text-blue-900 text-xs mb-1">Registro de IA Clínica</div>
              {details.model && <div className="text-xs"><span className="font-medium text-muted-foreground">Modelo:</span> {String(details.model)}</div>}
              {details.consultaId && <div className="text-xs"><span className="font-medium text-muted-foreground">Consulta:</span> <span className="font-mono">{String(details.consultaId)}</span></div>}
              {details.pacienteId && <div className="text-xs"><span className="font-medium text-muted-foreground">Paciente:</span> <span className="font-mono">{String(details.pacienteId)}</span></div>}
              {typeof details.tokensUsed === "number" && <div className="text-xs"><span className="font-medium text-muted-foreground">Tokens:</span> {details.tokensUsed}</div>}
              {typeof details.latencyMs === "number" && <div className="text-xs"><span className="font-medium text-muted-foreground">Latência:</span> {details.latencyMs} ms</div>}
              {typeof details.success === "boolean" && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Status:</span>{" "}
                  {details.success ? (
                    <Badge variant="secondary">Sucesso</Badge>
                  ) : (
                    <Badge variant="destructive">Falha</Badge>
                  )}
                </div>
              )}
              {details.errorMessage && (
                <div className="text-xs text-red-700">
                  <span className="font-medium">Erro:</span> {String(details.errorMessage)}
                </div>
              )}
              {details.promptHash && <div className="text-xs"><span className="font-medium text-muted-foreground">Prompt hash:</span> <span className="font-mono">{String(details.promptHash)}</span></div>}
              {details.outputHash && <div className="text-xs"><span className="font-medium text-muted-foreground">Output hash:</span> <span className="font-mono">{String(details.outputHash)}</span></div>}
            </div>
          )}

          {details.pacienteNome && (
            <div><span className="font-medium text-muted-foreground">Paciente:</span> {String(details.pacienteNome)}</div>
          )}
          {details.usuarioNome && (
            <div><span className="font-medium text-muted-foreground">Usuário:</span> {String(details.usuarioNome)}</div>
          )}
          {details.usuarioEmail && (
            <div><span className="font-medium text-muted-foreground">Email:</span> {String(details.usuarioEmail)}</div>
          )}
          {details.tipoDocumento && (
            <div><span className="font-medium text-muted-foreground">Tipo Documento:</span> {String(details.tipoDocumento)}</div>
          )}
          {details.tipo && (
            <div><span className="font-medium text-muted-foreground">Tipo:</span> {String(details.tipo)}</div>
          )}
          {(details.operacao || details.operation) && (
            <div><span className="font-medium text-muted-foreground">Operação:</span> {String(details.operacao || details.operation)}</div>
          )}
          {details.senhaAlterada && (
            <div><Badge variant="outline" className="text-amber-600 border-amber-300">Senha foi alterada</Badge></div>
          )}

          {camposAlterados && Object.keys(camposAlterados).length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground border-b pb-1">Campos Alterados:</div>
              <div className="space-y-1.5">
                {Object.entries(camposAlterados).map(([campo, { de, para }]) => (
                  <div key={campo} className="rounded border p-2 bg-muted/30">
                    <div className="font-medium text-xs mb-1">{campo}</div>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded line-through">
                        {de !== null && de !== undefined ? String(de) : "(vazio)"}
                      </span>
                      <span>→</span>
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                        {para !== null && para !== undefined ? String(para) : "(vazio)"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.entries(details)
            .filter(([k]) => !["pacienteNome", "usuarioNome", "usuarioEmail", "camposAlterados", "senhaAlterada", "tipoDocumento", "tipo", "operacao", "operation"].includes(k))
            .length > 0 && (
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground border-b pb-1">Outros:</div>
              {Object.entries(details)
                .filter(([k]) => !["pacienteNome", "usuarioNome", "usuarioEmail", "camposAlterados", "senhaAlterada", "tipoDocumento", "tipo", "operacao", "operation"].includes(k))
                .map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium">{key}:</span>{" "}
                    <span className="text-muted-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filtros
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Paginação client-side
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "2000");
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      if (resourceFilter && resourceFilter !== "all") params.set("resource", resourceFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/super-admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar logs");

      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.pagination.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset página ao mudar filtros
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [actionFilter, resourceFilter, startDate, endDate]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(logs.length / pagination.pageSize)),
    [logs.length, pagination.pageSize]
  );

  const paged = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return logs.slice(start, start + pagination.pageSize);
  }, [logs, pagination.pageIndex, pagination.pageSize]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Shield}
        title="Logs de Auditoria (LGPD)"
        subtitle="Registro de acessos e modificações em dados sensíveis"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Registros de Auditoria</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background">
                <SelectValue placeholder="Recurso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-36 h-8 text-xs bg-background"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Data Início"
            />
            <Input
              type="date"
              className="w-36 h-8 text-xs bg-background"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Data Fim"
            />
            <Button
              variant="outline"
              onClick={fetchLogs}
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
                <p className="text-sm text-muted-foreground">Carregando registros...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold py-3 w-[140px]">Data/Hora</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Usuário</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Clínica</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Ação</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Recurso</TableHead>
                      <TableHead className="text-xs font-semibold py-3">ID Recurso</TableHead>
                      <TableHead className="text-xs font-semibold py-3">IP</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((log) => {
                      const actionInfo = ACTION_LABELS[log.action] || { label: log.action, variant: "outline" as const };
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs py-3 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <div className="font-medium">{log.userName}</div>
                            <div className="text-muted-foreground">{log.userEmail}</div>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {TIPO_LABELS[log.userTipo] || log.userTipo}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {log.clinicaNome || "-"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {RESOURCE_LABELS[log.resource] || log.resource}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <span className="font-mono text-muted-foreground">
                              {log.resourceId ? `${log.resourceId.substring(0, 8)}...` : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <span className="font-mono">{log.ipAddress || "-"}</span>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <div className="flex items-center gap-1">
                              <span
                                className="text-muted-foreground max-w-[360px] truncate block"
                                title={formatAuditDetails(log)}
                              >
                                {formatAuditDetails(log)}
                              </span>
                              {log.details && (
                                <DetailDialog
                                  details={log.details}
                                  action={log.action}
                                  resource={log.resource}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Rodapé de paginação (mesmo padrão de Operadoras) */}
              <div className="flex items-center justify-between px-6 pb-6">
                <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
                  {logs.length} registro(s) encontrado(s).
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="rows-per-page" className="text-xs font-medium">
                      Linhas por página
                    </Label>
                    <Select
                      value={`${pagination.pageSize}`}
                      onValueChange={(value) => {
                        const size = Number(value);
                        setPagination({ pageIndex: 0, pageSize: size });
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
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
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
                        setPagination((p) => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))
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
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
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
    </div>
  );
}
