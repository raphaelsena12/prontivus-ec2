"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pill, Upload } from "lucide-react";
import { toast } from "sonner";
import { MedicamentosTable } from "./components/medicamentos-table";
import { MedicamentoDeleteDialog } from "./components/medicamento-delete-dialog";
import { MedicamentoDialog } from "./components/medicamento-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface Medicamento {
  id: string;
  nome: string;
  principioAtivo: string | null;
  laboratorio: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  unidade: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MedicamentosContentProps {
  clinicaId: string;
}

export function MedicamentosContent({ clinicaId }: MedicamentosContentProps) {
  const router = useRouter();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicamentoDialogOpen, setMedicamentoDialogOpen] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState<Medicamento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicamentoToDelete, setMedicamentoToDelete] = useState<Medicamento | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/medicamentos?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar medicamentos");
      const data = await response.json();
      setMedicamentos(data.medicamentos || []);
    } catch (error) {
      toast.error("Erro ao carregar medicamentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicamentos();
  }, [fetchMedicamentos]);

  const handleEdit = (medicamento: Medicamento) => {
    setEditingMedicamento(medicamento);
    setMedicamentoDialogOpen(true);
  };

  const handleDeleteClick = (medicamento: Medicamento) => {
    setMedicamentoToDelete(medicamento);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchMedicamentos();
    setMedicamentoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingMedicamento(null);
    setMedicamentoToDelete(null);
  };

  const handleCreate = () => {
    setEditingMedicamento(null);
    setMedicamentoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando medicamentos...</p>
            </div>
          </div>
        ) : medicamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum medicamento encontrado</p>
          </div>
        ) : (
          <MedicamentosTable 
            data={medicamentos} 
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
            onUpload={() => setUploadDialogOpen(true)}
          />
        )}
      </div>

      <MedicamentoDialog
        open={medicamentoDialogOpen}
        onOpenChange={setMedicamentoDialogOpen}
        medicamento={editingMedicamento}
        onSuccess={handleSuccess}
      />

      <MedicamentoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        medicamento={medicamentoToDelete}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/medicamentos"
        title="Upload de Medicamentos em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos medicamentos. O arquivo deve conter colunas: nome, principio_ativo, laboratorio, apresentacao, concentracao, unidade, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
