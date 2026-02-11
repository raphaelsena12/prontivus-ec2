"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { ManipuladosTable } from "./components/manipulados-table";
import { ManipuladoDialog } from "./components/manipulado-dialog";
import { ManipuladoDeleteDialog } from "./components/manipulado-delete-dialog";

interface Manipulado {
  id: string;
  descricao: string;
  informacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface ManipuladosContentProps {
  clinicaId: string;
}

export function ManipuladosContent({ clinicaId }: ManipuladosContentProps) {
  const router = useRouter();
  const [manipulados, setManipulados] = useState<Manipulado[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [manipuladoDialogOpen, setManipuladoDialogOpen] = useState(false);
  const [editingManipulado, setEditingManipulado] = useState<Manipulado | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingManipulado, setDeletingManipulado] = useState<Manipulado | null>(null);

  const fetchManipulados = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/medico/manipulados?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar manipulados");
      const data = await response.json();
      setManipulados(data.manipulados || []);
    } catch (error) {
      toast.error("Erro ao carregar manipulados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManipulados();
  }, [fetchManipulados]);

  const handleEdit = (manipulado: Manipulado) => {
    setEditingManipulado(manipulado);
    setManipuladoDialogOpen(true);
  };

  const handleDeleteClick = (manipulado: Manipulado) => {
    setDeletingManipulado(manipulado);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchManipulados();
    setManipuladoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingManipulado(null);
    setDeletingManipulado(null);
  };

  const handleCreate = () => {
    setEditingManipulado(null);
    setManipuladoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-4 lg:mx-6 rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Manipulados</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie e organize seus manipulados
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando manipulados...</p>
            </div>
          </div>
        ) : (
          <ManipuladosTable
            data={manipulados}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
          />
        )}
      </div>

      {/* DIALOGS */}
      <ManipuladoDialog
        open={manipuladoDialogOpen}
        onOpenChange={setManipuladoDialogOpen}
        manipulado={editingManipulado}
        onSuccess={handleSuccess}
      />

      <ManipuladoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        manipulado={deletingManipulado}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
