"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Filter, Loader2, Plus, Search, Stethoscope, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

import { CidsTable } from "@/app/(protected)/admin-clinica/cids/components/cids-table";
import { CidDialog } from "@/app/(protected)/admin-clinica/cids/components/cid-dialog";
import { CidDeleteDialog } from "@/app/(protected)/admin-clinica/cids/components/cid-delete-dialog";

interface Cid {
  id: string;
  codigo: string;
  descricao: string;
  grupoNome?: string | null;
  categoriaCod?: string | null;
  categoriaNome?: string | null;
  subcategoriaCod?: string | null;
  subcategoriaNome?: string | null;
  categoria: string | null;
  subcategoria: string | null;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

const API_BASE = "/api/super-admin/cids";
const PAGE_SIZE = 50;

export function CidsSuperAdminContent() {
  const [cids, setCids] = useState<Cid[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cid | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Cid | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  const fetchCids = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar CIDs");
      const data = await res.json();
      setCids(data.cids || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar CIDs");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchCids();
  }, [fetchCids]);

  const handleSuccess = useCallback(() => {
    fetchCids();
    setDialogOpen(false);
    setDeleteOpen(false);
    setEditing(null);
    setToDelete(null);
  }, [fetchCids]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Stethoscope}
        title="CIDs (Global)"
        subtitle="Gerencie o catálogo global de CIDs (usado por todos os tenants)"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de CIDs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por código ou descrição..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64"
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
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Novo CID
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando CIDs...</p>
              </div>
            </div>
          ) : cids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum CID encontrado</p>
            </div>
          ) : (
            <CidsTable
              data={cids}
              onEdit={(cid) => {
                setEditing(cid);
                setDialogOpen(true);
              }}
              onDelete={(cid) => {
                setToDelete(cid);
                setDeleteOpen(true);
              }}
              serverPagination={{
                total,
                page,
                pageSize: PAGE_SIZE,
                onPageChange: setPage,
              }}
            />
          )}
        </CardContent>
      </Card>

      <CidDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cid={editing}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <CidDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        cid={toDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/super-admin/upload/cids"
        title="Upload de CIDs em Massa"
        description='Faça upload de um Excel (.xlsx) com as colunas: "grupo_nome", "categoria_cod", "categoria_nome", "subcategoria_cod", "subcategoria_nome". (Também aceita o formato antigo: "CID" e "DESCRICAO").'
        onSuccess={handleSuccess}
      />
    </div>
  );
}

