"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { ExamesTable } from "./components/exames-table";
import { ExameDialog } from "./components/exame-dialog";
import { ExameDeleteDialog } from "./components/exame-delete-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface Exame {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface ExamesContentProps {
  clinicaId: string;
}

export function ExamesContent({ clinicaId }: ExamesContentProps) {
  const router = useRouter();
  const [exames, setExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [exameDialogOpen, setExameDialogOpen] = useState(false);
  const [editingExame, setEditingExame] = useState<Exame | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExame, setDeletingExame] = useState<Exame | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchExames = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/exames?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar exames");
      const data = await response.json();
      setExames(data.exames || []);
    } catch (error) {
      toast.error("Erro ao carregar exames");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExames();
  }, [fetchExames]);

  const handleEdit = (exame: Exame) => {
    setEditingExame(exame);
    setExameDialogOpen(true);
  };

  const handleDeleteClick = (exame: Exame) => {
    setDeletingExame(exame);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchExames();
    setExameDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingExame(null);
    setDeletingExame(null);
  };

  const handleCreate = () => {
    setEditingExame(null);
    setExameDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando exames...</p>
            </div>
          </div>
        ) : exames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum exame encontrado</p>
          </div>
        ) : (
          <ExamesTable
            data={exames}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
            onUpload={() => setUploadDialogOpen(true)}
          />
        )}
      </div>

      {/* DIALOGS */}
      <ExameDialog
        open={exameDialogOpen}
        onOpenChange={setExameDialogOpen}
        exame={editingExame}
        onSuccess={handleSuccess}
      />

      <ExameDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        exame={deletingExame}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/exames"
        title="Upload de Exames em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos exames. O arquivo deve conter colunas: nome, descricao, tipo, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
