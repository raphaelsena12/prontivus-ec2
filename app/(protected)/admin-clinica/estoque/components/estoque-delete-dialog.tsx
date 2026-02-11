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

interface Estoque {
  id: string;
  medicamento: {
    nome: string;
  };
}

interface EstoqueDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estoque: Estoque | null;
  onSuccess: () => void;
}

export function EstoqueDeleteDialog({
  open,
  onOpenChange,
  estoque,
  onSuccess,
}: EstoqueDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!estoque) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/estoque/${estoque.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir estoque");
      }

      toast.success("Estoque excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir estoque"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Estoque?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o estoque do medicamento{" "}
            <strong className="text-foreground">{estoque?.medicamento.nome}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente o estoque do sistema.
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











