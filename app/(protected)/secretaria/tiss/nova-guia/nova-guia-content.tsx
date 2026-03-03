"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FilePlus, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface Consulta {
  id: string;
  dataHora: string;
  numeroCarteirinha: string | null;
  valorCobrado: string | null;
  observacoes: string | null;
  paciente: { id: string; nome: string; cpf: string };
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  planoSaude: { id: string; nome: string } | null;
  codigoTuss: { id: string; codigoTuss: string; descricao: string } | null;
  medico: { id: string; usuario: { nome: string } } | null;
}

interface Operadora { id: string; codigoAns: string; razaoSocial: string }

const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Guia de Consulta",
  SPSADT: "Guia SP/SADT",
  INTERNACAO: "Guia de Internação",
  HONORARIO: "Guia de Honorário",
};

export function NovaGuiaContent() {
  const router = useRouter();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [filterOperadora, setFilterOperadora] = useState("all");
  const [filterQ, setFilterQ] = useState("");

  // Dialog de confirmação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [tipoGuia, setTipoGuia] = useState("CONSULTA");
  const [saving, setSaving] = useState(false);

  const fetchConsultas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterOperadora && filterOperadora !== "all") params.set("operadoraId", filterOperadora);
      if (filterQ.length >= 2) params.set("q", filterQ);

      const res = await fetch(`/api/secretaria/tiss/consultas-convenio?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConsultas(data.consultas ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar consultas");
    } finally {
      setLoading(false);
    }
  }, [filterOperadora, filterQ]);

  useEffect(() => { fetchConsultas(); }, [fetchConsultas]);

  useEffect(() => {
    fetch("/api/secretaria/tiss/dados?tipo=operadoras")
      .then((r) => r.json())
      .then(setOperadoras);
  }, []);

  const handleGerarGuia = (consulta: Consulta) => {
    setSelectedConsulta(consulta);
    setTipoGuia("CONSULTA");
    setDialogOpen(true);
  };

  const handleConfirmar = async () => {
    if (!selectedConsulta) return;
    setSaving(true);
    try {
      const res = await fetch("/api/secretaria/tiss/guias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoGuia,
          pacienteId: selectedConsulta.paciente.id,
          operadoraId: selectedConsulta.operadora.id,
          planoSaudeId: selectedConsulta.planoSaude?.id ?? null,
          numeroCarteirinha: selectedConsulta.numeroCarteirinha ?? "",
          dataAtendimento: new Date(selectedConsulta.dataHora).toISOString(),
          consultaId: selectedConsulta.id,
          observacoes: selectedConsulta.observacoes ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar guia"); return; }
      toast.success("Guia criada com sucesso");
      setDialogOpen(false);
      router.push(`/secretaria/tiss/guias/${data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FilePlus}
        title="Nova Guia TISS"
        subtitle="Selecione uma consulta realizada por convênio para gerar a guia"
      />

      <div className="flex flex-col gap-4">
        {/* Filtros */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Operadora</Label>
            <Select value={filterOperadora} onValueChange={setFilterOperadora}>
              <SelectTrigger className="h-9 text-xs w-52">
                <SelectValue placeholder="Todas as operadoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas as operadoras</SelectItem>
                {operadoras.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Paciente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                className="pl-9 h-9 text-xs w-56"
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                <TableHead className="text-xs font-semibold py-3">Operadora / Plano</TableHead>
                <TableHead className="text-xs font-semibold py-3">Data</TableHead>
                <TableHead className="text-xs font-semibold py-3">Procedimento TUSS</TableHead>
                <TableHead className="text-xs font-semibold py-3">Carteirinha</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Valor</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando consultas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : consultas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">
                        Nenhuma consulta de convênio pendente de guia
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Consultas realizadas por convênio aparecem aqui automaticamente
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                consultas.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{c.paciente.nome}</div>
                      <div className="text-muted-foreground">{c.paciente.cpf}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{c.operadora.razaoSocial}</div>
                      {c.planoSaude && (
                        <div className="text-muted-foreground">{c.planoSaude.nome}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {format(new Date(c.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      {c.codigoTuss ? (
                        <>
                          <span className="font-mono font-semibold text-primary">{c.codigoTuss.codigoTuss}</span>
                          <div className="text-muted-foreground truncate max-w-[180px]">{c.codigoTuss.descricao}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3 font-mono">
                      {c.numeroCarteirinha ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-medium">
                      {c.valorCobrado
                        ? `R$ ${parseFloat(c.valorCobrado).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleGerarGuia(c)}
                      >
                        <FilePlus className="h-3 w-3" />
                        Gerar Guia
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-muted-foreground text-right">{total} consulta(s) disponível(is)</p>
        )}
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Gerar Guia TISS</DialogTitle>
          </DialogHeader>
          {selectedConsulta && (
            <div className="space-y-4">
              {/* Resumo da consulta */}
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Paciente</span>
                  <span className="font-medium">{selectedConsulta.paciente.nome}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Operadora</span>
                  <span className="font-medium">{selectedConsulta.operadora.razaoSocial}</span>
                </div>
                {selectedConsulta.planoSaude && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-medium">{selectedConsulta.planoSaude.nome}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {format(new Date(selectedConsulta.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Carteirinha</span>
                  <span className="font-mono">{selectedConsulta.numeroCarteirinha ?? "—"}</span>
                </div>
                {selectedConsulta.codigoTuss && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">TUSS</span>
                    <span className="font-mono">{selectedConsulta.codigoTuss.codigoTuss}</span>
                  </div>
                )}
              </div>

              {/* Tipo de guia */}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Guia *</Label>
                <Select value={tipoGuia} onValueChange={setTipoGuia}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-8"
              onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={handleConfirmar}
              disabled={saving}>
              {saving ? "Gerando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
