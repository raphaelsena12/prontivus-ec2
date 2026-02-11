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

interface Manipulado {
  id: string;
  descricao: string;
}

interface ManipuladoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manipulado: Manipulado | null;
  onSuccess: () => void;
}

export function ManipuladoDeleteDialog({
  open,
  onOpenChange,
  manipulado,
  onSuccess,
}: ManipuladoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!manipulado) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/manipulados/${manipulado.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir manipulado");
      }

      toast.success("Manipulado excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir manipulado"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Manipulado?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o manipulado{" "}
            <strong className="text-foreground">{manipulado?.descricao}</strong>?
            <br />
            <br />
            Esta ação é irreversível e o manipulado será permanentemente removido do sistema.
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
