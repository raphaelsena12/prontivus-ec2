"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, FileText, Filter, Loader2, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Operadora | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operadoras;
    return operadoras.filter((o) => {
      return (
        o.codigoAns?.toLowerCase().includes(q) ||
        o.razaoSocial?.toLowerCase().includes(q) ||
        (o.nomeFantasia ?? "").toLowerCase().includes(q) ||
        (o.cnpj ?? "").includes(q)
      );
    });
  }, [operadoras, search]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pagination.pageSize)),
    [filtered.length, pagination.pageSize]
  );
  const paged = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filtered.slice(start, start + pagination.pageSize);
  }, [filtered, pagination.pageIndex, pagination.pageSize]);

  // Sempre que o filtro mudar, voltar para a primeira página (mesmo comportamento esperado)
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search]);

  const fetchOperadoras = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", limit: "2000" });
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar operadoras");
      const data = await res.json();
      setOperadoras(data.operadoras ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar operadoras");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleDisable = async (o: Operadora) => {
    try {
      const res = await fetch(`${API_BASE}/${o.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao desativar operadora");
      }
      toast.success("Operadora desativada");
      await fetchOperadoras();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao desativar operadora");
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma operadora encontrada</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold py-3">Código ANS</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Razão Social</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Nome Fantasia</TableHead>
                      <TableHead className="text-xs font-semibold py-3">CNPJ</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((o) => (
                      <TableRow key={o.id}>
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
                                  onClick={() => handleDisable(o)}
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

              {/* Rodapé de tabela no mesmo padrão de Formas de Pagamento (DENTRO do Card) */}
              {!loading && filtered.length > 0 && (
                <div className="flex items-center justify-between px-6 pb-6">
                  <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
                    {filtered.length} operadora(s) encontrada(s).
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
              <Input value={form.codigoAns} onChange={(e) => setForm((p) => ({ ...p, codigoAns: e.target.value }))} />
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
    </div>
  );
}

