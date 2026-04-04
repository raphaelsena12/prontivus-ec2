"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/zod-validation-error";

interface Operadora {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface Lote {
  id: string;
  numero: string;
}

interface Recebimento {
  id: string;
  operadora: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  };
  lote: {
    id: string;
    numero: string;
  } | null;
  valorRecebido: number;
  dataRecebimento: string;
  dataPrevista: string | null;
  numeroDocumento: string | null;
  metodoPagamento: string | null;
  observacoes: string | null;
}

interface RecebimentoForm {
  operadoraId: string;
  loteId: string;
  valorRecebido: string;
  dataRecebimento: string;
  dataPrevista: string;
  numeroDocumento: string;
  metodoPagamento: string;
  observacoes: string;
}

const emptyForm: RecebimentoForm = {
  operadoraId: "",
  loteId: "",
  valorRecebido: "",
  dataRecebimento: "",
  dataPrevista: "",
  numeroDocumento: "",
  metodoPagamento: "",
  observacoes: "",
};

const METODOS_PAGAMENTO = [
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "OUTRO", label: "Outro" },
];

export function RecebimentosConvenioContent() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterOperadoraId, setFilterOperadoraId] = useState<string>("all");
  const [filterDataInicio, setFilterDataInicio] = useState<string>("");
  const [filterDataFim, setFilterDataFim] = useState<string>("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecebimentoForm>(emptyForm);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const fetchRecebimentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterOperadoraId && filterOperadoraId !== "all")
        params.set("operadoraId", filterOperadoraId);
      if (filterDataInicio) params.set("dataInicio", filterDataInicio);
      if (filterDataFim) params.set("dataFim", filterDataFim);

      const res = await fetch(
        `/api/admin-clinica/recebimentos-convenio?${params.toString()}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecebimentos(data.recebimentos || data || []);
    } catch {
      toast.error("Erro ao carregar recebimentos");
    } finally {
      setLoading(false);
    }
  }, [filterOperadoraId, filterDataInicio, filterDataFim]);

  const fetchLotes = useCallback(async (operadoraId: string) => {
    if (!operadoraId) {
      setLotes([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin-clinica/recebimentos-convenio/lotes?operadoraId=${operadoraId}`
      );
      if (!res.ok) {
        setLotes([]);
        return;
      }
      const data = await res.json();
      setLotes(data.lotes || data || []);
    } catch {
      setLotes([]);
    }
  }, []);

  useEffect(() => {
    fetchOperadoras();
  }, [fetchOperadoras]);

  useEffect(() => {
    fetchRecebimentos();
  }, [fetchRecebimentos]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalRecebido = recebimentos.reduce(
      (sum, r) => sum + r.valorRecebido,
      0
    );
    const quantidade = recebimentos.length;
    const operadorasDistintas = new Set(
      recebimentos.map((r) => r.operadora.id)
    ).size;
    return { totalRecebido, quantidade, operadorasDistintas };
  }, [recebimentos]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setLotes([]);
    setDialogOpen(true);
  };

  const openEditDialog = (recebimento: Recebimento) => {
    setEditingId(recebimento.id);
    setForm({
      operadoraId: recebimento.operadora.id,
      loteId: recebimento.lote?.id || "",
      valorRecebido: String(recebimento.valorRecebido),
      dataRecebimento: recebimento.dataRecebimento
        ? recebimento.dataRecebimento.substring(0, 10)
        : "",
      dataPrevista: recebimento.dataPrevista
        ? recebimento.dataPrevista.substring(0, 10)
        : "",
      numeroDocumento: recebimento.numeroDocumento || "",
      metodoPagamento: recebimento.metodoPagamento || "",
      observacoes: recebimento.observacoes || "",
    });
    fetchLotes(recebimento.operadora.id);
    setDialogOpen(true);
  };

  const handleOperadoraChange = (value: string) => {
    setForm((prev) => ({ ...prev, operadoraId: value, loteId: "" }));
    fetchLotes(value);
  };

  const handleSubmit = async () => {
    if (!form.operadoraId || !form.valorRecebido || !form.dataRecebimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        operadoraId: form.operadoraId,
        loteId: form.loteId || undefined,
        valorRecebido: parseFloat(form.valorRecebido),
        dataRecebimento: form.dataRecebimento,
        dataPrevista: form.dataPrevista || undefined,
        numeroDocumento: form.numeroDocumento || undefined,
        metodoPagamento: form.metodoPagamento || undefined,
        observacoes: form.observacoes || undefined,
      };

      const isEditing = !!editingId;
      const url = isEditing
        ? `/api/admin-clinica/recebimentos-convenio/${editingId}`
        : "/api/admin-clinica/recebimentos-convenio";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) ||
            (isEditing
              ? "Erro ao atualizar recebimento"
              : "Erro ao registrar recebimento")
        );
      }

      toast.success(
        isEditing
          ? "Recebimento atualizado com sucesso"
          : "Recebimento registrado com sucesso"
      );
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchRecebimentos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar recebimento");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin-clinica/recebimentos-convenio/${deletingId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) || "Erro ao excluir recebimento"
        );
      }
      toast.success("Recebimento excluído com sucesso");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchRecebimentos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir recebimento");
    } finally {
      setDeleting(false);
    }
  };

  const getOperadoraDisplay = (op: { razaoSocial: string; nomeFantasia: string | null }) =>
    op.nomeFantasia || op.razaoSocial;

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={DollarSign}
        title="Recebimentos de Convênio"
        subtitle="Gerencie os recebimentos das operadoras de convênio"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Recebimento
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Recebido no Período
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(summary.totalRecebido)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Quantidade de Recebimentos
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">
              {summary.quantidade}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Operadoras Distintas
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-800">
              {summary.operadorasDistintas}
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
            <div className="w-44">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
              />
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
                  Carregando recebimentos...
                </p>
              </div>
            </div>
          ) : recebimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Nenhum recebimento encontrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operadora</TableHead>
                  <TableHead>Lote (N.)</TableHead>
                  <TableHead>Valor Recebido</TableHead>
                  <TableHead>Data Recebimento</TableHead>
                  <TableHead>N. Documento</TableHead>
                  <TableHead>Metodo Pagamento</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebimentos.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">
                      {getOperadoraDisplay(rec.operadora)}
                    </TableCell>
                    <TableCell>
                      {rec.lote ? rec.lote.numero : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      {formatCurrency(rec.valorRecebido)}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(rec.dataRecebimento))}
                    </TableCell>
                    <TableCell>{rec.numeroDocumento || "-"}</TableCell>
                    <TableCell>
                      {rec.metodoPagamento
                        ? METODOS_PAGAMENTO.find(
                            (m) => m.value === rec.metodoPagamento
                          )?.label || rec.metodoPagamento
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(rec)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(rec.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingId(null);
            setForm(emptyForm);
            setLotes([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Recebimento" : "Registrar Recebimento"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados do recebimento de convênio."
                : "Registre um novo recebimento de operadora de convênio."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Operadora <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.operadoraId}
                onValueChange={handleOperadoraChange}
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
              <Label>Lote</Label>
              <Select
                value={form.loteId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, loteId: v }))
                }
                disabled={!form.operadoraId || lotes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !form.operadoraId
                        ? "Selecione uma operadora primeiro"
                        : lotes.length === 0
                        ? "Nenhum lote disponível"
                        : "Selecione o lote (opcional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Valor Recebido <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.valorRecebido}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      valorRecebido: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Data Recebimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.dataRecebimento}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dataRecebimento: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Prevista</Label>
                <Input
                  type="date"
                  value={form.dataPrevista}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dataPrevista: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>N. Documento</Label>
                <Input
                  placeholder="Número do documento"
                  value={form.numeroDocumento}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      numeroDocumento: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select
                value={form.metodoPagamento}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, metodoPagamento: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGAMENTO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={form.observacoes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                "Atualizar"
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este recebimento? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
