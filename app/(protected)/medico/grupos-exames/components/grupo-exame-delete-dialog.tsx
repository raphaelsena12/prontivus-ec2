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

interface GrupoExame {
  id: string;
  nome: string;
}

interface GrupoExameDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoExame: GrupoExame | null;
  onSuccess: () => void;
}

export function GrupoExameDeleteDialog({
  open,
  onOpenChange,
  grupoExame,
  onSuccess,
}: GrupoExameDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!grupoExame) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/medico/grupos-exames/${grupoExame.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir grupo de exames");
      }

      toast.success("Grupo de exames excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir grupo de exames"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Grupo de Exames?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o grupo de exames{" "}
            <strong className="text-foreground">{grupoExame?.nome}</strong>?
            <br />
            <br />
            Esta ação é irreversível e o grupo de exames será permanentemente removido do sistema.
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
