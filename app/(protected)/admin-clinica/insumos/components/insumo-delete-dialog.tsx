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

interface Insumo {
  id: string;
  nome: string;
}

interface InsumoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo: Insumo | null;
  onSuccess: () => void;
}

export function InsumoDeleteDialog({
  open,
  onOpenChange,
  insumo,
  onSuccess,
}: InsumoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!insumo) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/insumos/${insumo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir insumo");
      }

      toast.success("Insumo excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir insumo"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Insumo?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o insumo{" "}
            <strong className="text-foreground">{insumo?.nome}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente o insumo do sistema.
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

