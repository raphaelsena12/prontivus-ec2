"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Stethoscope, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EspecialidadesTable } from "@/app/(protected)/admin-clinica/especialidades/components/especialidades-table";
import { EspecialidadeDialog } from "@/app/(protected)/admin-clinica/especialidades/components/especialidade-dialog";
import { EspecialidadeDeleteDialog } from "@/app/(protected)/admin-clinica/especialidades/components/especialidade-delete-dialog";
import { CategoriasTable } from "@/app/(protected)/super-admin/especialidades/components/categorias-table";
import { CategoriaDialog } from "@/app/(protected)/super-admin/especialidades/components/categoria-dialog";
import { CategoriaDeleteDialog } from "@/app/(protected)/super-admin/especialidades/components/categoria-delete-dialog";
import { RelacoesTable } from "@/app/(protected)/super-admin/especialidades/components/relacoes-table";
import { RelacaoDialog } from "@/app/(protected)/super-admin/especialidades/components/relacao-dialog";
import { RelacaoDeleteDialog } from "@/app/(protected)/super-admin/especialidades/components/relacao-delete-dialog";

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
}

const API_BASE = "/api/super-admin/especialidades";
const API_CATEGORIAS_BASE = "/api/super-admin/especialidades-categorias";
const API_RELACOES_BASE = "/api/super-admin/especialidades-categorias-itens";

export function EspecialidadesSuperAdminContent() {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Especialidade | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Especialidade | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any | null>(null);
  const [categoriaDeleteOpen, setCategoriaDeleteOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<any | null>(null);
  const [uploadCategoriasDialogOpen, setUploadCategoriasDialogOpen] = useState(false);

  const [relacoes, setRelacoes] = useState<any[]>([]);
  const [loadingRelacoes, setLoadingRelacoes] = useState(true);
  const [relacaoDialogOpen, setRelacaoDialogOpen] = useState(false);
  const [relacaoDeleteOpen, setRelacaoDeleteOpen] = useState(false);
  const [relacaoToDelete, setRelacaoToDelete] = useState<any | null>(null);
  const [uploadRelacoesDialogOpen, setUploadRelacoesDialogOpen] = useState(false);

  const fetchEspecialidades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}?limit=5000`);
      if (!res.ok) throw new Error("Erro ao carregar especialidades");
      const data = await res.json();
      setEspecialidades(data.especialidades || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar especialidades");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategorias = useCallback(async () => {
    try {
      setLoadingCategorias(true);
      const res = await fetch(`${API_CATEGORIAS_BASE}?limit=5000`);
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      const data = await res.json();
      setCategorias(data.categorias || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  const fetchRelacoes = useCallback(async () => {
    try {
      setLoadingRelacoes(true);
      const res = await fetch(`${API_RELACOES_BASE}?limit=5000`);
      if (!res.ok) throw new Error("Erro ao carregar relações");
      const data = await res.json();
      setRelacoes(data.itens || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar relações");
    } finally {
      setLoadingRelacoes(false);
    }
  }, []);

  useEffect(() => {
    fetchEspecialidades();
    fetchCategorias();
    fetchRelacoes();
  }, [fetchEspecialidades, fetchCategorias, fetchRelacoes]);

  const handleSuccess = () => {
    fetchEspecialidades();
    fetchCategorias();
    fetchRelacoes();
    setDialogOpen(false);
    setDeleteOpen(false);
    setEditing(null);
    setToDelete(null);

    setCategoriaDialogOpen(false);
    setCategoriaDeleteOpen(false);
    setEditingCategoria(null);
    setCategoriaToDelete(null);

    setRelacaoDialogOpen(false);
    setRelacaoDeleteOpen(false);
    setRelacaoToDelete(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Stethoscope}
        title="Especialidades (Global)"
        subtitle="Gerencie o catálogo global de especialidades (usado por todos os tenants)"
      />

      <Tabs defaultValue="especialidades" className="w-full">
        <div className="flex items-center justify-between gap-3 mb-3">
          <TabsList>
            <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="relacoes">Relações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="especialidades">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
              <CardTitle className="text-sm font-semibold">Lista de Especialidades</CardTitle>
              <div className="flex items-center gap-2">
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
                  Nova Especialidade
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando especialidades...</p>
                  </div>
                </div>
              ) : especialidades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-muted-foreground text-center">Nenhuma especialidade encontrada</p>
                </div>
              ) : (
                <EspecialidadesTable
                  data={especialidades}
                  onEdit={(esp) => {
                    setEditing(esp);
                    setDialogOpen(true);
                  }}
                  onDelete={(esp) => {
                    setToDelete(esp);
                    setDeleteOpen(true);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
              <CardTitle className="text-sm font-semibold">Lista de Categorias</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadCategoriasDialogOpen(true)}
                  className="h-8 w-8 p-0"
                  title="Upload em Massa"
                  aria-label="Upload em Massa"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setEditingCategoria(null);
                    setCategoriaDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Nova Categoria
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCategorias ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando categorias...</p>
                  </div>
                </div>
              ) : categorias.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-muted-foreground text-center">Nenhuma categoria encontrada</p>
                </div>
              ) : (
                <CategoriasTable
                  data={categorias}
                  onEdit={(cat) => {
                    setEditingCategoria(cat);
                    setCategoriaDialogOpen(true);
                  }}
                  onDelete={(cat) => {
                    setCategoriaToDelete(cat);
                    setCategoriaDeleteOpen(true);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relacoes">
          <Card className="bg-white border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
              <CardTitle className="text-sm font-semibold">Especialidade ↔ Categoria</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadRelacoesDialogOpen(true)}
                  className="h-8 w-8 p-0"
                  title="Upload em Massa"
                  aria-label="Upload em Massa"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setRelacaoDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Novo Vínculo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRelacoes ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando relações...</p>
                  </div>
                </div>
              ) : relacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-muted-foreground text-center">Nenhuma relação cadastrada</p>
                </div>
              ) : (
                <RelacoesTable
                  data={relacoes}
                  onDelete={(item) => {
                    setRelacaoToDelete(item);
                    setRelacaoDeleteOpen(true);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EspecialidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        especialidade={editing}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <EspecialidadeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        especialidade={toDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/super-admin/upload/especialidades"
        title="Upload de Especialidades em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "CODIGO", "NOME" e "DESCRICAO" (opcional).'
        onSuccess={handleSuccess}
      />

      <CategoriaDialog
        open={categoriaDialogOpen}
        onOpenChange={setCategoriaDialogOpen}
        categoria={editingCategoria}
        onSuccess={handleSuccess}
        apiBasePath={API_CATEGORIAS_BASE}
      />

      <CategoriaDeleteDialog
        open={categoriaDeleteOpen}
        onOpenChange={setCategoriaDeleteOpen}
        categoria={categoriaToDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_CATEGORIAS_BASE}
      />

      <UploadExcelDialog
        open={uploadCategoriasDialogOpen}
        onOpenChange={setUploadCategoriasDialogOpen}
        endpoint="/api/super-admin/upload/especialidades-categorias"
        title="Upload de Categorias em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "CODIGO" e "NOME".'
        onSuccess={handleSuccess}
      />

      <RelacaoDialog
        open={relacaoDialogOpen}
        onOpenChange={setRelacaoDialogOpen}
        especialidades={especialidades}
        categorias={categorias}
        onSuccess={handleSuccess}
        apiBasePath={API_RELACOES_BASE}
      />

      <RelacaoDeleteDialog
        open={relacaoDeleteOpen}
        onOpenChange={setRelacaoDeleteOpen}
        item={relacaoToDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_RELACOES_BASE}
      />

      <UploadExcelDialog
        open={uploadRelacoesDialogOpen}
        onOpenChange={setUploadRelacoesDialogOpen}
        endpoint="/api/super-admin/upload/especialidades-categorias-itens"
        title="Upload de Relações em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "ESPECIALIDADE_ID" + "CATEGORIA_ID" (UUID) ou "ESPECIALIDADE_CODIGO" + "CATEGORIA_CODIGO". (Aceita também "area_id" como alias de "categoria_id").'
        onSuccess={handleSuccess}
      />
    </div>
  );
}

