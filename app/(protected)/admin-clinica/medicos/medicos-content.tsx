"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Upload, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { MedicosTable } from "./components/medicos-table";
import { MedicoDeleteDialog } from "./components/medico-delete-dialog";
import { MedicoDialog } from "./components/medico-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Médicos</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie os médicos cadastrados na clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Médicos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Médico
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando médicos...</p>
              </div>
            </div>
          ) : medicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
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
        </CardContent>
      </Card>

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
