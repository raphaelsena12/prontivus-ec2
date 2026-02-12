"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Upload, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { EspecialidadesTable } from "./components/especialidades-table";
import { EspecialidadeDeleteDialog } from "./components/especialidade-delete-dialog";
import { EspecialidadeDialog } from "./components/especialidade-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface EspecialidadesContentProps {
  clinicaId: string;
}

export function EspecialidadesContent({ clinicaId }: EspecialidadesContentProps) {
  const router = useRouter();
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [especialidadeDialogOpen, setEspecialidadeDialogOpen] = useState(false);
  const [editingEspecialidade, setEditingEspecialidade] = useState<Especialidade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [especialidadeToDelete, setEspecialidadeToDelete] = useState<Especialidade | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchEspecialidades = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/especialidades`);
      if (!response.ok) throw new Error("Erro ao carregar especialidades");
      const data = await response.json();
      setEspecialidades(data.especialidades || []);
    } catch (error) {
      toast.error("Erro ao carregar especialidades");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEspecialidades();
  }, [fetchEspecialidades]);

  const handleEdit = (especialidade: Especialidade) => {
    setEditingEspecialidade(especialidade);
    setEspecialidadeDialogOpen(true);
  };

  const handleDeleteClick = (especialidade: Especialidade) => {
    setEspecialidadeToDelete(especialidade);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchEspecialidades();
    setEspecialidadeDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingEspecialidade(null);
    setEspecialidadeToDelete(null);
  };

  const handleCreate = () => {
    setEditingEspecialidade(null);
    setEspecialidadeDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Especialidades</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie as especialidades médicas cadastradas
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Especialidades</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
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
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onCreate={handleCreate}
              onUpload={() => setUploadDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <EspecialidadeDialog
        open={especialidadeDialogOpen}
        onOpenChange={setEspecialidadeDialogOpen}
        especialidade={editingEspecialidade}
        onSuccess={handleSuccess}
      />

      <EspecialidadeDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        especialidade={especialidadeToDelete}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/especialidades"
        title="Upload de Especialidades em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados das especialidades. O arquivo deve conter colunas: codigo, nome, descricao, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
