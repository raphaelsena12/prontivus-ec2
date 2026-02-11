"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Especialidade {
  id: string;
  nome: string;
}

interface EspecialidadeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  especialidade: Especialidade | null;
  onSuccess: () => void;
}

export function EspecialidadeDeleteDialog({
  open,
  onOpenChange,
  especialidade,
  onSuccess,
}: EspecialidadeDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!especialidade) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/especialidades/${especialidade.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir especialidade");
      }

      toast.success("Especialidade excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir especialidade"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Especialidade?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a especialidade{" "}
            <strong className="text-foreground">{especialidade?.nome}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente a especialidade do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}











