"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DollarSign,
  Building2,
  Calendar,
  Plus,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/zod-validation-error";

interface Operadora {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface Faturamento {
  id: string;
  mesReferencia: string;
  operadora: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  };
  valorFaturado: number;
  valorRecebido: number;
  valorGlosado: number;
  status: "ABERTO" | "FECHADO" | "CONCILIADO";
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Marco" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function FaturamentoConvenioContent() {
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterOperadoraId, setFilterOperadoraId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fechar Faturamento Dialog
  const [fecharDialogOpen, setFecharDialogOpen] = useState(false);
  const [fecharForm, setFecharForm] = useState({
    operadoraId: "",
    mes: String(new Date().getMonth() + 1).padStart(2, "0"),
    ano: String(CURRENT_YEAR),
  });

  // Registrar Recebimento Dialog (inline on FECHADO rows)
  const [recebimentoDialogOpen, setRecebimentoDialogOpen] = useState(false);
  const [recebimentoFaturamentoId, setRecebimentoFaturamentoId] = useState<
    string | null
  >(null);
  const [recebimentoValor, setRecebimentoValor] = useState("");

  // Conciliar state
  const [conciliando, setConciliando] = useState<string | null>(null);

  const fetchOperadoras = useCallback(async () => {
    try {
      const res = await fetch("/api/admin-clinica/operadoras");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const accepted = (data.operadoras || data || []).filter(
        (op: any) => op.aceitaNaClinica !== false
      );
      setOperadoras(
        accepted.map((op: any) => ({
          id: op.id,
          razaoSocial: op.razaoSocial,
          nomeFantasia: op.nomeFantasia,
        }))
      );
    } catch {
      toast.error("Erro ao carregar operadoras");
    }
  }, []);

  const fetchFaturamentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterOperadoraId && filterOperadoraId !== "all")
        params.set("operadoraId", filterOperadoraId);
      if (filterStatus && filterStatus !== "all")
        params.set("status", filterStatus);

      const res = await fetch(
        `/api/admin-clinica/faturamento-convenio?${params.toString()}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFaturamentos(data.faturamentos || data || []);
    } catch {
      toast.error("Erro ao carregar faturamentos");
    } finally {
      setLoading(false);
    }
  }, [filterOperadoraId, filterStatus]);

  useEffect(() => {
    fetchOperadoras();
  }, [fetchOperadoras]);

  useEffect(() => {
    fetchFaturamentos();
  }, [fetchFaturamentos]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalFaturado = faturamentos.reduce(
      (sum, f) => sum + f.valorFaturado,
      0
    );
    const totalRecebido = faturamentos.reduce(
      (sum, f) => sum + f.valorRecebido,
      0
    );
    const totalGlosado = faturamentos.reduce(
      (sum, f) => sum + f.valorGlosado,
      0
    );
    const saldoPendente = totalFaturado - totalRecebido;
    return { totalFaturado, totalRecebido, totalGlosado, saldoPendente };
  }, [faturamentos]);

  const getOperadoraDisplay = (op: {
    razaoSocial: string;
    nomeFantasia: string | null;
  }) => op.nomeFantasia || op.razaoSocial;

  const getStatusBadge = (status: Faturamento["status"]) => {
    switch (status) {
      case "ABERTO":
        return (
          <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
            Aberto
          </Badge>
        );
      case "FECHADO":
        return (
          <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
            Fechado
          </Badge>
        );
      case "CONCILIADO":
        return (
          <Badge variant="outline" className="border-green-400 bg-green-50 text-green-700">
            Conciliado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMesReferencia = (mesRef: string) => {
    try {
      const date = new Date(mesRef);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch {
      return mesRef;
    }
  };

  // Fechar Faturamento
  const handleFecharFaturamento = async () => {
    if (!fecharForm.operadoraId) {
      toast.error("Selecione a operadora");
      return;
    }

    setSubmitting(true);
    try {
      const mesReferencia = `${fecharForm.ano}-${fecharForm.mes}-01`;

      const res = await fetch("/api/admin-clinica/faturamento-convenio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operadoraId: fecharForm.operadoraId,
          mesReferencia,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) || "Erro ao fechar faturamento"
        );
      }

      toast.success("Faturamento fechado com sucesso");
      setFecharDialogOpen(false);
      setFecharForm({
        operadoraId: "",
        mes: String(new Date().getMonth() + 1).padStart(2, "0"),
        ano: String(CURRENT_YEAR),
      });
      fetchFaturamentos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar faturamento");
    } finally {
      setSubmitting(false);
    }
  };

  // Registrar Recebimento inline
  const openRecebimentoDialog = (faturamentoId: string) => {
    setRecebimentoFaturamentoId(faturamentoId);
    setRecebimentoValor("");
    setRecebimentoDialogOpen(true);
  };

  const handleRegistrarRecebimento = async () => {
    if (!recebimentoFaturamentoId || !recebimentoValor) {
      toast.error("Informe o valor recebido");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin-clinica/faturamento-convenio/${recebimentoFaturamentoId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valorRecebido: parseFloat(recebimentoValor),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) || "Erro ao registrar recebimento"
        );
      }

      toast.success("Recebimento registrado com sucesso");
      setRecebimentoDialogOpen(false);
      setRecebimentoFaturamentoId(null);
      setRecebimentoValor("");
      fetchFaturamentos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar recebimento");
    } finally {
      setSubmitting(false);
    }
  };

  // Conciliar
  const handleConciliar = async (faturamentoId: string) => {
    setConciliando(faturamentoId);
    try {
      const res = await fetch(
        `/api/admin-clinica/faturamento-convenio/${faturamentoId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONCILIADO" }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) || "Erro ao conciliar faturamento"
        );
      }

      toast.success("Faturamento conciliado com sucesso");
      fetchFaturamentos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao conciliar faturamento");
    } finally {
      setConciliando(null);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Building2}
        title="Faturamento Convênio"
        subtitle="Acompanhe o faturamento e conciliação com operadoras de convênio"
      >
        <Button onClick={() => setFecharDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Fechar Faturamento
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Faturado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">
              {formatCurrency(summary.totalFaturado)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Recebido
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(summary.totalRecebido)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Total Glosado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-800">
              {formatCurrency(summary.totalGlosado)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">
              Saldo Pendente
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-800">
              {formatCurrency(summary.saldoPendente)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-64">
              <Label className="text-xs">Operadora</Label>
              <Select
                value={filterOperadoraId}
                onValueChange={setFilterOperadoraId}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as operadoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operadoras</SelectItem>
                  {operadoras.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {getOperadoraDisplay(op)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="FECHADO">Fechado</SelectItem>
                  <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Carregando faturamentos...
                </p>
              </div>
            </div>
          ) : faturamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Nenhum faturamento encontrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes Referencia</TableHead>
                  <TableHead>Operadora</TableHead>
                  <TableHead>Valor Faturado</TableHead>
                  <TableHead>Valor Recebido</TableHead>
                  <TableHead>Valor Glosado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturamentos.map((fat) => {
                  const saldo = fat.valorFaturado - fat.valorRecebido;
                  return (
                    <TableRow key={fat.id}>
                      <TableCell className="font-medium">
                        {formatMesReferencia(fat.mesReferencia)}
                      </TableCell>
                      <TableCell>
                        {getOperadoraDisplay(fat.operadora)}
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">
                        {formatCurrency(fat.valorFaturado)}
                      </TableCell>
                      <TableCell className="font-medium text-green-700">
                        {formatCurrency(fat.valorRecebido)}
                      </TableCell>
                      <TableCell className="font-medium text-red-700">
                        {formatCurrency(fat.valorGlosado)}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          saldo > 0
                            ? "text-yellow-700"
                            : saldo === 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {formatCurrency(saldo)}
                      </TableCell>
                      <TableCell>{getStatusBadge(fat.status)}</TableCell>
                      <TableCell className="text-right">
                        {fat.status === "FECHADO" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => openRecebimentoDialog(fat.id)}
                            >
                              <DollarSign className="mr-1 h-3.5 w-3.5" />
                              Recebimento
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => handleConciliar(fat.id)}
                              disabled={conciliando === fat.id}
                            >
                              {conciliando === fat.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              )}
                              Conciliar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fechar Faturamento Dialog */}
      <Dialog
        open={fecharDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFecharDialogOpen(false);
            setFecharForm({
              operadoraId: "",
              mes: String(new Date().getMonth() + 1).padStart(2, "0"),
              ano: String(CURRENT_YEAR),
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Faturamento</DialogTitle>
            <DialogDescription>
              Feche o faturamento mensal de uma operadora para iniciar o processo
              de cobranca e conciliacao.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Operadora <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fecharForm.operadoraId}
                onValueChange={(v) =>
                  setFecharForm((prev) => ({ ...prev, operadoraId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operadora" />
                </SelectTrigger>
                <SelectContent>
                  {operadoras.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {getOperadoraDisplay(op)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mes Referencia</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={fecharForm.mes}
                  onValueChange={(v) =>
                    setFecharForm((prev) => ({ ...prev, mes: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={fecharForm.ano}
                  onValueChange={(v) =>
                    setFecharForm((prev) => ({ ...prev, ano: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-700">
                Os valores serao calculados automaticamente com base nas guias do
                periodo selecionado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFecharDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleFecharFaturamento} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fechando...
                </>
              ) : (
                "Fechar Faturamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Recebimento Dialog */}
      <Dialog
        open={recebimentoDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRecebimentoDialogOpen(false);
            setRecebimentoFaturamentoId(null);
            setRecebimentoValor("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>
              Informe o valor recebido da operadora para este faturamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Valor Recebido (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={recebimentoValor}
                onChange={(e) => setRecebimentoValor(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecebimentoDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleRegistrarRecebimento} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
