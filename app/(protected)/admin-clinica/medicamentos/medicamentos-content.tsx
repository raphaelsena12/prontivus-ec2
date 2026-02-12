"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pill, Upload, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { MedicamentosTable } from "./components/medicamentos-table";
import { MedicamentoDeleteDialog } from "./components/medicamento-delete-dialog";
import { MedicamentoDialog } from "./components/medicamento-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Pill className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Medicamentos</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie os medicamentos cadastrados na clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Medicamentos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Medicamento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando medicamentos...</p>
              </div>
            </div>
          ) : medicamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
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
        </CardContent>
      </Card>

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
