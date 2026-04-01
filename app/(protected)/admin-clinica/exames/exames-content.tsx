"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Filter, ClipboardList, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import {
  CatalogoUnificadoTable,
  type LinhaCatalogoUnificado,
} from "../components/catalogo-unificado-table";
import { ExameDialog } from "./components/exame-dialog";
import { ExameDeleteDialog } from "./components/exame-delete-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 50;

interface Exame {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  codigoTussId: string | null;
  ativo: boolean;
  codigoTuss?: {
    id: string;
    codigoTuss: string;
    descricao: string;
    tipoProcedimento: string;
  } | null;
}

interface ExamesContentProps {
  clinicaId: string;
}

export function ExamesContent({ clinicaId: _clinicaId }: ExamesContentProps) {
  const [rows, setRows] = useState<LinhaCatalogoUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExame, setEditingExame] = useState<Exame | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMeta, setDeletingMeta] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  const fetchLista = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim().length) params.set("search", search.trim());
      const response = await fetch(
        `/api/admin-clinica/exames/lista-unificada?${params.toString()}`
      );
      if (!response.ok) throw new Error("Erro ao carregar lista");
      const data = await response.json();
      setRows(data.items || []);
      const tp = data.pagination?.totalPages;
      setTotalPages(typeof tp === "number" && tp > 0 ? tp : 1);
    } catch (error) {
      toast.error("Erro ao carregar exames");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  const handleEdit = async (row: LinhaCatalogoUnificado) => {
    if (row.origem !== "CLINICA") return;
    try {
      const res = await fetch(`/api/admin-clinica/exames/${row.sourceId}`);
      if (!res.ok) throw new Error("Erro ao carregar exame");
      const data = await res.json();
      setEditingExame(data.exame);
      setDialogOpen(true);
    } catch (e) {
      toast.error("Não foi possível abrir o exame para edição");
    }
  };

  const handleDeleteClick = (row: LinhaCatalogoUnificado) => {
    if (row.origem !== "CLINICA") return;
    const nome = row.descricao.split(" — ")[0] || row.descricao;
    setDeletingMeta({ id: row.sourceId, nome });
    setDeleteOpen(true);
  };

  const handleCreate = () => {
    setEditingExame(null);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchLista();
    setDialogOpen(false);
    setEditingExame(null);
    setDeleteOpen(false);
    setDeletingMeta(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={ClipboardList}
        title="Exames"
        subtitle="Catálogo TUSS (somente leitura) e exames próprios da clínica (editáveis)"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Exames — TUSS e clínica
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-7 text-xs bg-background w-64"
              />
            </div>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Novo exame
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">
                Nenhum registro encontrado.
              </p>
            </div>
          ) : (
            <CatalogoUnificadoTable
              data={rows}
              entityLabel="exame(s)"
              variant="exames"
              serverPageCount={totalPages}
              serverPageIndex={page - 1}
              serverPageSize={PAGE_SIZE}
              onServerPageChange={(idx) => setPage(idx + 1)}
              onEditClinica={handleEdit}
              onDeleteClinica={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      <ExameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exame={editingExame}
        onSuccess={handleSuccess}
      />

      <ExameDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        exame={deletingMeta}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
