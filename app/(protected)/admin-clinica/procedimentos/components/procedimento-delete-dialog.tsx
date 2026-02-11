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

interface Procedimento {
  id: string;
  nome: string;
}

interface ProcedimentoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento: Procedimento | null;
  onSuccess: () => void;
}

export function ProcedimentoDeleteDialog({
  open,
  onOpenChange,
  procedimento,
  onSuccess,
}: ProcedimentoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!procedimento) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/procedimentos/${procedimento.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir procedimento");
      }

      toast.success("Procedimento excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir procedimento"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Procedimento?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o procedimento{" "}
            <strong className="text-foreground">{procedimento?.nome}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente o procedimento do sistema.
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











