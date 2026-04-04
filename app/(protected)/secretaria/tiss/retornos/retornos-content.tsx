"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileCheck, Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Operadora {
  id: string;
  codigoAns: string;
  razaoSocial: string;
}

interface LoteResumido {
  id: string;
  numeroLote: string;
  status: string;
}

interface Retorno {
  id: string;
  numeroProtocolo: string | null;
  status: string;
  dataRecebimento: string;
  observacoes: string | null;
  createdAt: string;
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  lote: { id: string; numeroLote: string } | null;
  _count?: { glosas: number };
  glosasCount?: number;
}

const STATUS_CLASSES: Record<string, string> = {
  RECEBIDO:   "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
  PROCESSADO: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
};

const STATUS_LABELS: Record<string, string> = {
  RECEBIDO: "Recebido",
  PROCESSADO: "Processado",
};

export function RetornosContent() {
  const router = useRouter();
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterOperadora, setFilterOperadora] = useState<string>("ALL");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [lotesFiltrados, setLotesFiltrados] = useState<LoteResumido[]>([]);

  // Form fields
  const [formOperadora, setFormOperadora] = useState("");
  const [formLote, setFormLote] = useState("");
  const [formProtocolo, setFormProtocolo] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [criando, setCriando] = useState(false);

  const fetchRetornos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterOperadora !== "ALL") params.set("operadoraId", filterOperadora);

      const res = await fetch(`/api/secretaria/tiss/retornos?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRetornos(data.retornos ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar retornos");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterOperadora]);

  useEffect(() => {
    fetchRetornos();
  }, [fetchRetornos]);

  useEffect(() => {
    fetch("/api/secretaria/tiss/dados?tipo=operadoras")
      .then((r) => r.json())
      .then(setOperadoras)
      .catch(() => {});
  }, []);

  // Fetch lotes XML_GERADO when operadora changes in the dialog
  useEffect(() => {
    if (!formOperadora) {
      setLotesFiltrados([]);
      setFormLote("");
      return;
    }
    fetch(`/api/secretaria/tiss/lotes?status=XML_GERADO&operadoraId=${formOperadora}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setLotesFiltrados(data.lotes ?? []);
        setFormLote("");
      })
      .catch(() => setLotesFiltrados([]));
  }, [formOperadora]);

  const handleRegistrar = async () => {
    if (!formOperadora || !formProtocolo.trim()) {
      toast.error("Operadora e Protocolo sao obrigatorios");
      return;
    }
    setCriando(true);
    try {
      const body: Record<string, string> = {
        operadoraId: formOperadora,
        numeroProtocolo: formProtocolo.trim(),
      };
      if (formLote) body.loteId = formLote;
      if (formObservacoes.trim()) body.observacoes = formObservacoes.trim();

      const res = await fetch("/api/secretaria/tiss/retornos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Retorno registrado com sucesso");
        setDialogOpen(false);
        resetForm();
        fetchRetornos();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao registrar retorno");
      }
    } catch {
      toast.error("Erro ao registrar retorno");
    } finally {
      setCriando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este retorno? Esta acao nao pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/secretaria/tiss/retornos/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Retorno excluido");
        fetchRetornos();
      } else {
        toast.error("Erro ao excluir retorno");
      }
    } catch {
      toast.error("Erro ao excluir retorno");
    }
  };

  const resetForm = () => {
    setFormOperadora("");
    setFormLote("");
    setFormProtocolo("");
    setFormObservacoes("");
  };

  const getGlosasCount = (retorno: Retorno) => {
    return retorno._count?.glosas ?? retorno.glosasCount ?? 0;
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileCheck}
        title="Retornos de Lotes"
        subtitle="Registre e processe os retornos recebidos das operadoras de saude"
      />

      <div className="flex flex-col">
        {/* Toolbar: Filters + Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Todos os Status</SelectItem>
                <SelectItem value="RECEBIDO" className="text-xs">Recebido</SelectItem>
                <SelectItem value="PROCESSADO" className="text-xs">Processado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterOperadora} onValueChange={setFilterOperadora}>
              <SelectTrigger className="h-9 text-xs w-[220px]">
                <SelectValue placeholder="Operadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Todas as Operadoras</SelectItem>
                {operadoras.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="h-9 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Retorno
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Protocolo</TableHead>
                <TableHead className="text-xs font-semibold py-3">Operadora</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-center">Lote</TableHead>
                <TableHead className="text-xs font-semibold py-3">Data Recebimento</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-center">Glosas</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando retornos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : retornos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FileCheck className="h-12 w-12 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Nenhum retorno encontrado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                retornos.map((retorno) => (
                  <TableRow key={retorno.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-3 font-semibold text-primary font-mono">
                      {retorno.numeroProtocolo ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{retorno.operadora.razaoSocial}</div>
                      <div className="text-muted-foreground">ANS: {retorno.operadora.codigoAns}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center font-mono">
                      {retorno.lote ? `#${retorno.lote.numeroLote}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {format(new Date(retorno.dataRecebimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {getGlosasCount(retorno) > 0 ? (
                        <Badge variant="outline" className="bg-transparent border-red-400 text-red-600 text-[10px] py-0.5 px-1.5 leading-tight">
                          {getGlosasCount(retorno)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <Badge variant="outline" className={STATUS_CLASSES[retorno.status] ?? STATUS_CLASSES.RECEBIDO}>
                        {STATUS_LABELS[retorno.status] ?? retorno.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/secretaria/tiss/retornos/${retorno.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                        {retorno.status === "RECEBIDO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => handleExcluir(retorno.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-right">{total} retorno(s)</p>
        )}
      </div>

      {/* Dialog: Registrar Retorno */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Registrar Retorno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Operadora *</Label>
              <Select value={formOperadora} onValueChange={setFormOperadora}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar operadora..." />
                </SelectTrigger>
                <SelectContent>
                  {operadoras.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.razaoSocial} — ANS: {o.codigoAns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lote Vinculado (opcional)</Label>
              {formOperadora ? (
                <Select value={formLote} onValueChange={setFormLote}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecionar lote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lotesFiltrados.length === 0 ? (
                      <SelectItem value="__none" disabled className="text-xs text-muted-foreground">
                        Nenhum lote com XML gerado
                      </SelectItem>
                    ) : (
                      lotesFiltrados.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">
                          Lote #{l.numeroLote}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground pt-1">
                  Selecione uma operadora para ver os lotes disponiveis
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">N Protocolo *</Label>
              <Input
                className="h-9 text-xs"
                placeholder="Numero do protocolo recebido da operadora"
                value={formProtocolo}
                onChange={(e) => setFormProtocolo(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observacoes</Label>
              <Textarea
                className="text-xs min-h-[80px] resize-none"
                placeholder="Observacoes adicionais sobre o retorno..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={handleRegistrar}
              disabled={!formOperadora || !formProtocolo.trim() || criando}
            >
              {criando ? "Registrando..." : "Registrar Retorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
