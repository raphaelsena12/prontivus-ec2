"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Upload } from "lucide-react";
import { toast } from "sonner";
import { MedicosTable } from "./components/medicos-table";
import { MedicoDeleteDialog } from "./components/medico-delete-dialog";
import { MedicoDialog } from "./components/medico-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface Medico {
  id: string;
  crm: string;
  especialidade: string;
  limiteMaximoRetornosPorDia?: number | null;
  ativo?: boolean;
  createdAt: Date;
  usuario: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface MedicosContentProps {
  clinicaId: string;
}

export function MedicosContent({ clinicaId }: MedicosContentProps) {
  const router = useRouter();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicoDialogOpen, setMedicoDialogOpen] = useState(false);
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicoToDelete, setMedicoToDelete] = useState<Medico | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchMedicos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/medicos?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar médicos");
      const data = await response.json();
      setMedicos(data.medicos || []);
    } catch (error) {
      toast.error("Erro ao carregar médicos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin-clinica/usuarios-medicos`);
      if (!response.ok) throw new Error("Erro ao carregar usuários médicos");
      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.error("Erro ao carregar usuários médicos:", error);
    }
  }, []);

  useEffect(() => {
    fetchMedicos();
    fetchUsuarios();
  }, [fetchMedicos, fetchUsuarios]);

  const handleEdit = async (medico: Medico) => {
    try {
      // Buscar dados completos do médico
      const response = await fetch(`/api/admin-clinica/medicos/${medico.id}`);
      if (!response.ok) throw new Error("Erro ao carregar médico");
      const data = await response.json();
      setEditingMedico(data.medico);
      setMedicoDialogOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do médico");
      console.error(error);
    }
  };

  const handleDeleteClick = (medico: Medico) => {
    setMedicoToDelete(medico);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchMedicos();
    setMedicoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingMedico(null);
    setMedicoToDelete(null);
  };

  const handleCreate = () => {
    setEditingMedico(null);
    setMedicoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando médicos...</p>
            </div>
          </div>
        ) : medicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum médico encontrado</p>
          </div>
        ) : (
          <MedicosTable 
            data={medicos} 
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
            onUpload={() => setUploadDialogOpen(true)}
          />
        )}
      </div>

      <MedicoDialog
        open={medicoDialogOpen}
        onOpenChange={setMedicoDialogOpen}
        medico={editingMedico}
        usuarios={usuarios}
        onSuccess={handleSuccess}
      />

      <MedicoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        medico={medicoToDelete}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/medicos"
        title="Upload de Médicos em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos médicos. O arquivo deve conter colunas: nome, email, cpf, crm, especialidade, telefone, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
