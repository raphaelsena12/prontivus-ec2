"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { ProcedimentosTable } from "./components/procedimentos-table";
import { ProcedimentoDeleteDialog } from "./components/procedimento-delete-dialog";
import { ProcedimentoDialog } from "./components/procedimento-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number | string; // Pode vir como Decimal do Prisma (string) ou number
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcedimentosContentProps {
  clinicaId: string;
}

export function ProcedimentosContent({ clinicaId }: ProcedimentosContentProps) {
  const router = useRouter();
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [procedimentoDialogOpen, setProcedimentoDialogOpen] = useState(false);
  const [editingProcedimento, setEditingProcedimento] = useState<Procedimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [procedimentoToDelete, setProcedimentoToDelete] = useState<Procedimento | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchProcedimentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/procedimentos?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar procedimentos");
      const data = await response.json();
      setProcedimentos(data.procedimentos || []);
    } catch (error) {
      toast.error("Erro ao carregar procedimentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcedimentos();
  }, [fetchProcedimentos]);

  const handleEdit = (procedimento: Procedimento) => {
    setEditingProcedimento(procedimento);
    setProcedimentoDialogOpen(true);
  };

  const handleDeleteClick = (procedimento: Procedimento) => {
    setProcedimentoToDelete(procedimento);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchProcedimentos();
    setProcedimentoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingProcedimento(null);
    setProcedimentoToDelete(null);
  };

  const handleCreate = () => {
    setEditingProcedimento(null);
    setProcedimentoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando procedimentos...</p>
            </div>
          </div>
        ) : procedimentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum procedimento encontrado</p>
          </div>
        ) : (
          <ProcedimentosTable 
            data={procedimentos} 
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
            onUpload={() => setUploadDialogOpen(true)}
          />
        )}
      </div>

      <ProcedimentoDialog
        open={procedimentoDialogOpen}
        onOpenChange={setProcedimentoDialogOpen}
        procedimento={editingProcedimento}
        onSuccess={handleSuccess}
      />

      <ProcedimentoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        procedimento={procedimentoToDelete}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/procedimentos"
        title="Upload de Procedimentos em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos procedimentos. O arquivo deve conter colunas: codigo, nome, descricao, valor, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
