"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  AlertTriangle, Eye, MessageSquare, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Operadora {
  id: string;
  codigoAns: string;
  razaoSocial: string;
}

interface Glosa {
  id: string;
  codigoGlosa: string;
  descricaoGlosa: string | null;
  valorGlosado: string;
  status: string;
  justificativaContestacao: string | null;
  dataGlosa: string;
  dataContestacao: string | null;
  dataResolucao: string | null;
  createdAt: string;
  guia: {
    id: string;
    numeroGuia: string | null;
    paciente: { nome: string };
    operadora: { id: string; razaoSocial: string };
  };
  procedimento: {
    id: string;
    codigoTuss: { codigoTuss: string; descricao: string };
  } | null;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  GLOSADA:    { label: "Glosada",    className: "bg-transparent border-red-500 text-red-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  CONTESTADA: { label: "Contestada", className: "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  ACEITA:     { label: "Aceita",     className: "bg-transparent border-slate-500 text-slate-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  REVERTIDA:  { label: "Revertida",  className: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  MANTIDA:    { label: "Mantida",    className: "bg-transparent border-orange-500 text-orange-700 text-[10px] py-0.5 px-1.5 leading-tight" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "GLOSADA", label: "Glosada" },
  { value: "CONTESTADA", label: "Contestada" },
  { value: "ACEITA", label: "Aceita" },
  { value: "REVERTIDA", label: "Revertida" },
  { value: "MANTIDA", label: "Mantida" },
];

const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function GlosasContent() {
  const router = useRouter();

  /* Data state */
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [loading, setLoading] = useState(true);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState("all");
  const [operadoraFilter, setOperadoraFilter] = useState("all");

  /* Contestar dialog */
  const [contestarOpen, setContestarOpen] = useState(false);
  const [contestarGlosa, setContestarGlosa] = useState<Glosa | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [submittingContestar, setSubmittingContestar] = useState(false);

  /* Aceitar dialog */
  const [aceitarOpen, setAceitarOpen] = useState(false);
  const [aceitarGlosa, setAceitarGlosa] = useState<Glosa | null>(null);
  const [submittingAceitar, setSubmittingAceitar] = useState(false);

  /* ---- Fetch ---------------------------------------------------- */

  const fetchGlosas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (operadoraFilter !== "all") params.set("operadoraId", operadoraFilter);

      const res = await fetch(`/api/secretaria/tiss/glosas?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGlosas(data.glosas ?? data ?? []);
    } catch {
      toast.error("Erro ao carregar glosas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, operadoraFilter]);

  useEffect(() => {
    fetchGlosas();
  }, [fetchGlosas]);

  useEffect(() => {
    fetch("/api/secretaria/tiss/dados?tipo=operadoras")
      .then((r) => r.json())
      .then(setOperadoras)
      .catch(() => {});
  }, []);

  /* ---- Summary cards -------------------------------------------- */

  const totalGlosado = glosas.reduce(
    (acc, g) => acc + parseFloat(g.valorGlosado || "0"),
    0
  );
  const countPendentes = glosas.filter((g) => g.status === "GLOSADA").length;
  const countContestadas = glosas.filter((g) => g.status === "CONTESTADA").length;
  const countResolvidas = glosas.filter(
    (g) => g.status === "ACEITA" || g.status === "REVERTIDA" || g.status === "MANTIDA"
  ).length;

  /* ---- Actions -------------------------------------------------- */

  const openContestar = (glosa: Glosa) => {
    setContestarGlosa(glosa);
    setJustificativa("");
    setContestarOpen(true);
  };

  const handleContestar = async () => {
    if (!contestarGlosa || !justificativa.trim()) return;
    setSubmittingContestar(true);
    try {
      const res = await fetch(
        `/api/secretaria/tiss/glosas/${contestarGlosa.id}/contestar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ justificativa: justificativa.trim() }),
        }
      );
      if (res.ok) {
        toast.success("Glosa contestada com sucesso");
        setContestarOpen(false);
        fetchGlosas();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao contestar glosa");
      }
    } catch {
      toast.error("Erro ao contestar glosa");
    } finally {
      setSubmittingContestar(false);
    }
  };

  const openAceitar = (glosa: Glosa) => {
    setAceitarGlosa(glosa);
    setAceitarOpen(true);
  };

  const handleAceitar = async () => {
    if (!aceitarGlosa) return;
    setSubmittingAceitar(true);
    try {
      const res = await fetch(
        `/api/secretaria/tiss/glosas/${aceitarGlosa.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACEITA" }),
        }
      );
      if (res.ok) {
        toast.success("Glosa aceita com sucesso");
        setAceitarOpen(false);
        fetchGlosas();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao aceitar glosa");
      }
    } catch {
      toast.error("Erro ao aceitar glosa");
    } finally {
      setSubmittingAceitar(false);
    }
  };

  /* ---- Render --------------------------------------------------- */

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={AlertTriangle}
        title="Glosas"
        subtitle="Gerencie glosas recebidas das operadoras de saude"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="py-4 border-red-200 bg-red-50/40">
          <CardContent className="px-4 py-0">
            <p className="text-[10px] uppercase tracking-wide text-red-600/70 font-medium mb-1">
              Total Glosado
            </p>
            <p className="text-lg font-bold text-red-700">
              {formatCurrency.format(totalGlosado)}
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 border-yellow-200 bg-yellow-50/40">
          <CardContent className="px-4 py-0">
            <p className="text-[10px] uppercase tracking-wide text-yellow-600/70 font-medium mb-1">
              Pendentes
            </p>
            <p className="text-lg font-bold text-yellow-700">{countPendentes}</p>
            <p className="text-[10px] text-yellow-600/60">glosa(s) sem resposta</p>
          </CardContent>
        </Card>

        <Card className="py-4 border-blue-200 bg-blue-50/40">
          <CardContent className="px-4 py-0">
            <p className="text-[10px] uppercase tracking-wide text-blue-600/70 font-medium mb-1">
              Contestadas
            </p>
            <p className="text-lg font-bold text-blue-700">{countContestadas}</p>
            <p className="text-[10px] text-blue-600/60">aguardando retorno</p>
          </CardContent>
        </Card>

        <Card className="py-4 border-green-200 bg-green-50/40">
          <CardContent className="px-4 py-0">
            <p className="text-[10px] uppercase tracking-wide text-green-600/70 font-medium mb-1">
              Resolvidas
            </p>
            <p className="text-lg font-bold text-green-700">{countResolvidas}</p>
            <p className="text-[10px] text-green-600/60">aceitas, revertidas ou mantidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Operadora:</Label>
          <Select value={operadoraFilter} onValueChange={setOperadoraFilter}>
            <SelectTrigger className="h-9 text-xs w-[220px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todas as operadoras
              </SelectItem>
              {operadoras.map((o) => (
                <SelectItem key={o.id} value={o.id} className="text-xs">
                  {o.razaoSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="text-xs font-semibold py-3">Guia</TableHead>
              <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
              <TableHead className="text-xs font-semibold py-3">Procedimento</TableHead>
              <TableHead className="text-xs font-semibold py-3">Cod. Glosa</TableHead>
              <TableHead className="text-xs font-semibold py-3 text-right">Valor Glosado</TableHead>
              <TableHead className="text-xs font-semibold py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold py-3">Data</TableHead>
              <TableHead className="text-xs font-semibold py-3 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">Carregando glosas...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : glosas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground opacity-50" />
                    <span className="text-xs text-muted-foreground">Nenhuma glosa encontrada</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              glosas.map((glosa) => {
                const cfg = STATUS_CONFIG[glosa.status] ?? STATUS_CONFIG.GLOSADA;
                return (
                  <TableRow key={glosa.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-3 font-mono font-semibold text-primary">
                      {glosa.guia.numeroGuia ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{glosa.guia.paciente.nome}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {glosa.guia.operadora.razaoSocial}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      {glosa.procedimento ? (
                        <div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {glosa.procedimento.codigoTuss.codigoTuss}
                          </span>
                          <div className="font-medium truncate max-w-[200px]">
                            {glosa.procedimento.codigoTuss.descricao}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono">{glosa.codigoGlosa}</TableCell>
                    <TableCell className="text-xs py-3 text-right font-medium text-red-600">
                      {formatCurrency.format(parseFloat(glosa.valorGlosado || "0"))}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <Badge variant="outline" className={cfg.className}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {formatDate(glosa.dataGlosa)}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/secretaria/tiss/glosas/${glosa.id}`)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {glosa.status === "GLOSADA" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                              onClick={() => openContestar(glosa)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              Contestar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-700 hover:border-slate-300"
                              onClick={() => openAceitar(glosa)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Aceitar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && glosas.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {glosas.length} glosa(s)
        </p>
      )}

      {/* Dialog: Contestar Glosa */}
      <Dialog open={contestarOpen} onOpenChange={setContestarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Contestar Glosa</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {contestarGlosa && (
                <>
                  Glosa <span className="font-mono font-semibold">{contestarGlosa.codigoGlosa}</span>
                  {" "}— Guia {contestarGlosa.guia.numeroGuia ?? "s/n"}
                  {" "}— {formatCurrency.format(parseFloat(contestarGlosa.valorGlosado || "0"))}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Justificativa da Contestacao *</Label>
              <Textarea
                className="text-xs min-h-[120px]"
                placeholder="Descreva a justificativa para contestar esta glosa..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setContestarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              disabled={!justificativa.trim() || submittingContestar}
              onClick={handleContestar}
            >
              {submittingContestar ? "Enviando..." : "Enviar Contestacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Aceitar Glosa */}
      <Dialog open={aceitarOpen} onOpenChange={setAceitarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Aceitar Glosa</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {aceitarGlosa && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs">
                  <span className="text-muted-foreground">Codigo:</span>{" "}
                  <span className="font-mono font-semibold">{aceitarGlosa.codigoGlosa}</span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Valor:</span>{" "}
                  <span className="font-medium text-red-600">
                    {formatCurrency.format(parseFloat(aceitarGlosa.valorGlosado || "0"))}
                  </span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Paciente:</span>{" "}
                  {aceitarGlosa.guia.paciente.nome}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Ao aceitar, voce reconhece que o valor glosado nao sera contestado.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setAceitarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs h-8"
              disabled={submittingAceitar}
              onClick={handleAceitar}
            >
              {submittingAceitar ? "Processando..." : "Confirmar Aceite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
