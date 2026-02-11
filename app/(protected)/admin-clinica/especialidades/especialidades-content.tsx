"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Upload } from "lucide-react";
import { toast } from "sonner";
import { EspecialidadesTable } from "./components/especialidades-table";
import { EspecialidadeDeleteDialog } from "./components/especialidade-delete-dialog";
import { EspecialidadeDialog } from "./components/especialidade-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

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
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando especialidades...</p>
            </div>
          </div>
        ) : especialidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
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
      </div>

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
