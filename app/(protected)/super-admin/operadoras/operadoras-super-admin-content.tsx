"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Edit, FileText, Filter, Loader2, Plus, Power, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
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

interface Operadora {
  id: string;
  codigoAns: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = "/api/super-admin/operadoras";

type FormState = Partial<Operadora> & {
  codigoAns: string;
  razaoSocial: string;
};

const emptyForm: FormState = {
  codigoAns: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  telefone: "",
  email: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  pais: "Brasil",
  ativo: true,
};

export function OperadorasSuperAdminContent() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Operadora | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [operadoraToDisable, setOperadoraToDisable] = useState<Operadora | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const allPageIds = operadoras.map((o) => o.id);
  const selectedCount = selectedIds.size;
  const isAllSelected =
    operadoras.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const isIndeterminate =
    selectedCount > 0 && operadoras.length > 0 && !isAllSelected;

  // Debounce de 300ms no search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Limpar seleção quando a página mudar
  useEffect(() => {
    setSelectedIds(new Set());
  }, [operadoras]);

  const fetchOperadoras = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar operadoras");
      const data = await res.json();
      setOperadoras(data.operadoras ?? []);
      setTotalItems(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar operadoras");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchOperadoras();
  }, [fetchOperadoras]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (o: Operadora) => {
    setEditing(o);
    setForm({
      codigoAns: o.codigoAns,
      razaoSocial: o.razaoSocial,
      nomeFantasia: o.nomeFantasia ?? "",
      cnpj: o.cnpj ?? "",
      telefone: o.telefone ?? "",
      email: o.email ?? "",
      cep: o.cep ?? "",
      endereco: o.endereco ?? "",
      numero: o.numero ?? "",
      complemento: o.complemento ?? "",
      bairro: o.bairro ?? "",
      cidade: o.cidade ?? "",
      estado: o.estado ?? "",
      pais: o.pais ?? "Brasil",
      ativo: o.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        codigoAns: form.codigoAns,
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || null,
        cnpj: form.cnpj || null,
        telefone: form.telefone || null,
        email: form.email || null,
        cep: form.cep || null,
        endereco: form.endereco || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        pais: form.pais || "Brasil",
        ativo: form.ativo ?? true,
      };

      const res = await fetch(editing ? `${API_BASE}/${editing.id}` : API_BASE, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao salvar operadora");
      }
      toast.success(editing ? "Operadora atualizada" : "Operadora criada");
      setDialogOpen(false);
      setEditing(null);
      await fetchOperadoras();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar operadora");
    } finally {
      setSaving(false);
    }
  };

  const openDisableDialog = (o: Operadora) => {
    setOperadoraToDisable(o);
    setDisableDialogOpen(true);
  };

  const confirmDisable = async () => {
    if (!operadoraToDisable) return;
    try {
      const res = await fetch(`${API_BASE}/${operadoraToDisable.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao desativar operadora");
      }
      toast.success("Operadora desativada");
      setDisableDialogOpen(false);
      setOperadoraToDisable(null);
      await fetchOperadoras();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao desativar operadora");
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of allPageIds) next.add(id);
      } else {
        for (const id of allPageIds) next.delete(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch(`${API_BASE}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao excluir operadoras em massa");
      }
      const data = await res.json().catch(() => ({}));
      toast.success(`Operadora(s) excluída(s): ${data?.excluidas ?? 0}`);
      if (data?.erros?.length) {
        const preview = data.erros.slice(0, 3).join("; ");
        const more = data.erros.length > 3 ? ` e mais ${data.erros.length - 3} erro(s)` : "";
        toast.warning(`${data.erros.length} com erro: ${preview}${more}.`, { duration: 8000 });
      }
      setBulkDialogOpen(false);
      setSelectedIds(new Set());
      await fetchOperadoras();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir operadoras em massa");
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title="Operadoras (Global)"
        subtitle="Gerencie o catálogo global de operadoras/convenîos. As clínicas apenas selecionam quais aceitam."
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Operadoras</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por ANS, razão social, fantasia, CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-72"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(true)}
              className="h-8 w-8 p-0"
              title="Upload em Massa"
              aria-label="Upload em Massa"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(true)}
              disabled={selectedIds.size === 0}
              className="h-8 text-xs px-3 border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              title={selectedIds.size ? "Excluir selecionadas" : "Selecione ao menos 1 operadora"}
            >
              Excluir em massa ({selectedIds.size})
            </Button>
            <Button
              onClick={openCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Nova Operadora
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando operadoras...</p>
              </div>
            </div>
          ) : operadoras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma operadora encontrada</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                            onCheckedChange={(v) => toggleSelectAllFiltered(Boolean(v))}
                            aria-label="Selecionar todas as operadoras filtradas"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-semibold py-3">Código ANS</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Razão Social</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Nome Fantasia</TableHead>
                      <TableHead className="text-xs font-semibold py-3">CNPJ</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operadoras.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs py-3">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedIds.has(o.id)}
                              onCheckedChange={(v) => toggleSelect(o.id, Boolean(v))}
                              aria-label={`Selecionar operadora ${o.razaoSocial}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3 font-medium">{o.codigoAns}</TableCell>
                        <TableCell className="text-xs py-3">{o.razaoSocial}</TableCell>
                        <TableCell className="text-xs py-3">{o.nomeFantasia || "-"}</TableCell>
                        <TableCell className="text-xs py-3">{o.cnpj || "-"}</TableCell>
                        <TableCell className="text-xs py-3">
                          {o.ativo ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
                              Inativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEdit(o)}
                              title="Editar operadora"
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Editar
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  aria-label="Mais ações"
                                  title="Mais ações"
                                >
                                  <span className="text-base leading-none">⋯</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => openDisableDialog(o)}
                                >
                                  <Power className="h-4 w-4" />
                                  Desativar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Rodapé de paginação */}
              {!loading && totalItems > 0 && (
                <div className="flex items-center justify-between px-6 pb-6">
                  <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
                    {totalItems} operadora(s) encontrada(s).
                  </div>
                  <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                      <Label htmlFor="rows-per-page" className="text-xs font-medium">
                        Linhas por página
                      </Label>
                      <Select
                        value={`${limit}`}
                        onValueChange={(value) => {
                          setLimit(Number(value));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger size="sm" className="w-20 h-7 text-xs" id="rows-per-page">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                          {[10, 20, 30, 40, 50].map((s) => (
                            <SelectItem key={s} value={`${s}`}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-fit items-center justify-center text-xs font-medium">
                      Página {page} de {totalPages}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                      <Button
                        variant="outline"
                        className="hidden h-7 w-7 p-0 lg:flex text-xs"
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                      >
                        <span className="sr-only">Primeira página</span>
                        <IconChevronsLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-7 w-7 text-xs"
                        size="icon"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <span className="sr-only">Página anterior</span>
                        <IconChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-7 w-7 text-xs"
                        size="icon"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        <span className="sr-only">Próxima página</span>
                        <IconChevronRight className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        className="hidden h-7 w-7 lg:flex text-xs"
                        size="icon"
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                      >
                        <span className="sr-only">Última página</span>
                        <IconChevronsRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar operadora" : "Nova operadora"}</DialogTitle>
            <DialogDescription>Cadastro global (super-admin). Use dados oficiais (ANS/CNPJ).</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Código ANS</label>
              <Input value={form.codigoAns} maxLength={6} placeholder="6 dígitos numéricos" onChange={(e) => setForm((p) => ({ ...p, codigoAns: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">CNPJ</label>
              <Input value={form.cnpj ?? ""} onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Razão Social</label>
              <Input value={form.razaoSocial} onChange={(e) => setForm((p) => ({ ...p, razaoSocial: e.target.value }))} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Nome Fantasia</label>
              <Input value={form.nomeFantasia ?? ""} onChange={(e) => setForm((p) => ({ ...p, nomeFantasia: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Telefone</label>
              <Input value={form.telefone ?? ""} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={form.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Endereço</label>
              <Input value={form.endereco ?? ""} onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Número</label>
              <Input value={form.numero ?? ""} onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Complemento</label>
              <Input value={form.complemento ?? ""} onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bairro</label>
              <Input value={form.bairro ?? ""} onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cidade</label>
              <Input value={form.cidade ?? ""} onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Input value={form.estado ?? ""} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">CEP</label>
              <Input value={form.cep ?? ""} onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.codigoAns || !form.razaoSocial}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/super-admin/upload/operadoras"
        title="Upload de Operadoras em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "codigo_ans", "razao_social" (obrigatórias) e opcionalmente "nome_fantasia", "cnpj", "telefone", "email", "cep", "endereco"/"logradouro", "numero", "complemento", "bairro", "cidade", "estado"/"uf", "pais", "ativo".'
        onSuccess={fetchOperadoras}
      />

      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir operadoras em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <b>{selectedIds.size}</b> operadora(s) selecionada(s). Essa ação é
              irreversível. Se alguma operadora tiver vínculos (consultas/guias/planos), ela não poderá ser excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
            >
              Excluir agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar operadora</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a operadora{" "}
              <b>{operadoraToDisable?.razaoSocial}</b>? Essa ação pode afetar
              planos de saúde, guias TISS e consultas vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOperadoraToDisable(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDisable}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

