"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Filter, FileText, Upload, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { CodigosTussTableSuperAdmin } from "./components/codigos-tuss-table";
import { CodigoTussDeleteDialogSuperAdmin } from "./components/codigo-tuss-delete-dialog";
import { CodigosTussClearDialog } from "./components/codigos-tuss-clear-dialog";
import { useRouter } from "next/navigation";

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
  descricaoDetalhada: string | null;
  tipoProcedimento: string;
  categoriaExame: string | null;
  sipGrupo?: string | null;
  categoriaProntivus?: string | null;
  categoriaSadt?: string | null;
  usaGuiaSadt?: boolean;
  subgrupoTuss?: string | null;
  grupoTuss?: string | null;
  capituloTuss?: string | null;
  fonteAnsTabela22?: string | null;
  dataVigenciaInicio: Date | string;
  dataVigenciaFim: Date | string | null;
  ativo: boolean;
  createdAt?: Date | string;
}

export function CodigosTussSuperAdminContent() {
  const router = useRouter();
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codigoTussToDelete, setCodigoTussToDelete] = useState<CodigoTuss | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchCodigosTuss = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (globalFilter.trim().length) params.set("search", globalFilter.trim());

      const response = await fetch(
        `/api/super-admin/codigos-tuss${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (!response.ok) throw new Error("Erro ao carregar códigos TUSS");
      const data = await response.json();

      const codigosTussProcessados = (data.codigosTuss || []).map((codigo: any) => {
        let dataVigenciaInicio: Date | string = codigo.dataVigenciaInicio;
        let dataVigenciaFim: Date | string | null = codigo.dataVigenciaFim;
        let createdAt: Date | string | undefined = codigo.createdAt;

        try {
          if (codigo.dataVigenciaInicio) {
            dataVigenciaInicio = new Date(codigo.dataVigenciaInicio);
            if (isNaN((dataVigenciaInicio as Date).getTime())) {
              dataVigenciaInicio = codigo.dataVigenciaInicio;
            }
          }
          if (codigo.dataVigenciaFim) {
            dataVigenciaFim = new Date(codigo.dataVigenciaFim);
            if (isNaN((dataVigenciaFim as Date).getTime())) {
              dataVigenciaFim = codigo.dataVigenciaFim;
            }
          }
          if (codigo.createdAt) {
            createdAt = new Date(codigo.createdAt);
            if (isNaN((createdAt as Date).getTime())) {
              createdAt = codigo.createdAt;
            }
          }
        } catch {
          // manter como string se der erro
        }

        return {
          ...codigo,
          dataVigenciaInicio,
          dataVigenciaFim,
          createdAt,
        };
      });

      setCodigosTuss(codigosTussProcessados);
    } catch (error) {
      toast.error("Erro ao carregar códigos TUSS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [globalFilter]);

  useEffect(() => {
    fetchCodigosTuss();
  }, [fetchCodigosTuss]);

  const handleDeleteClick = (codigoTuss: CodigoTuss) => {
    setCodigoTussToDelete(codigoTuss);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchCodigosTuss();
  };

  const handleUploadSuccess = () => {
    fetchCodigosTuss();
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title="Catálogo TUSS"
        subtitle="Gerencie os códigos TUSS globais do sistema"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Códigos TUSS</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por código ou descrição..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
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
              variant="outline"
              onClick={() => setClearDialogOpen(true)}
              className="h-8 text-xs px-3 border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-3 w-3" />
              Excluir em Massa
            </Button>
            <Button
              onClick={() => router.push("/super-admin/codigos-tuss/novo")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Código
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando códigos TUSS...</p>
              </div>
            </div>
          ) : (
            <CodigosTussTableSuperAdmin
              data={codigosTuss}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onDelete={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      <CodigoTussDeleteDialogSuperAdmin
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        codigoTuss={codigoTussToDelete}
        onSuccess={handleDeleteSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/super-admin/upload/codigos-tuss"
        title="Upload de Catálogo TUSS em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "codigo", "descricao_tuss", "sip_grupo", "categoria_prontivus", "categoria_sadt", "usa_guia_sadt", "subgrupo_tuss", "grupo_tuss", "capitulo_tuss", "fonte_ans_tabela22". (O sistema também aceita o layout antigo com "Código do Termo", "Termo", "Tipo", "Categoria", "Data de início de vigência", "Data de fim de vigência".)'
        onSuccess={handleUploadSuccess}
      />

      <CodigosTussClearDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

