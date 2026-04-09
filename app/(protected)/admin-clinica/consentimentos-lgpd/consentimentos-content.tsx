"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ShieldCheck, Search, Filter, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react";
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
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { maskCPF } from "@/lib/utils";

interface PacienteConsentimento {
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteEmail: string | null;
  pacienteCelular: string | null;
  status: "aceito" | "pendente" | "revogado";
  canalAceite: string | null;
  aceitoEm: string | null;
  revogadoEm: string | null;
  versaoTermo: string | null;
}

interface Stats {
  total: number;
  aceitos: number;
  pendentes: number;
  revogados: number;
}

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

const STATUS_CONFIG = {
  aceito: {
    label: "Aceito",
    icon: CheckCircle,
    className: "bg-transparent border-green-500 text-green-700",
  },
  pendente: {
    label: "Pendente",
    icon: Clock,
    className: "bg-transparent border-amber-500 text-amber-700",
  },
  revogado: {
    label: "Revogado",
    icon: XCircle,
    className: "bg-transparent border-red-500 text-red-700",
  },
};

const CANAL_LABELS: Record<string, string> = {
  PORTAL_ONLINE: "Portal Online",
  PRESENCIAL: "Presencial",
};

export function ConsentimentosContent() {
  const [pacientes, setPacientes] = useState<PacienteConsentimento[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, aceitos: 0, pendentes: 0, revogados: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "todos") params.set("status", statusFilter);

      const res = await fetch(`/api/admin-clinica/consentimentos?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar consentimentos");

      const data = await res.json();
      setPacientes(data.pacientes);
      setStats(data.stats);
    } catch {
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(pacientes.length / pagination.pageSize)),
    [pacientes.length, pagination.pageSize]
  );

  const paged = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return pacientes.slice(start, start + pagination.pageSize);
  }, [pacientes, pagination.pageIndex, pagination.pageSize]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={ShieldCheck}
        title="Consentimentos LGPD"
        subtitle="Gerencie os termos de consentimento dos pacientes para tratamento de dados"
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de Pacientes</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aceitos</p>
            <p className="text-2xl font-bold text-green-600">{stats.aceitos}</p>
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
            <p className="text-xs text-muted-foreground">Revogados</p>
            <p className="text-2xl font-bold text-red-600">{stats.revogados}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Pacientes</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aceito">Aceitos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="revogado">Revogados</SelectItem>
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
          ) : pacientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum paciente encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                      <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Contato</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Canal</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Data do Aceite</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Versão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((p) => {
                      const config = STATUS_CONFIG[p.status];
                      const StatusIcon = config.icon;
                      return (
                        <TableRow key={p.pacienteId}>
                          <TableCell className="text-xs py-3 font-medium">
                            {p.pacienteNome}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {maskCPF(p.pacienteCpf)}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground">
                            {p.pacienteEmail || p.pacienteCelular || "-"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <Badge variant="outline" className={`${config.className} text-[10px] py-0.5 px-1.5 leading-tight`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {p.canalAceite ? CANAL_LABELS[p.canalAceite] || p.canalAceite : "-"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {p.status === "revogado"
                              ? `Revogado em ${formatDateTime(p.revogadoEm)}`
                              : formatDateTime(p.aceitoEm)}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground">
                            {p.versaoTermo || "-"}
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
                  {pacientes.length} paciente(s) encontrado(s).
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
