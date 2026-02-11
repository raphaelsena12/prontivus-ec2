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

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
}

interface CodigoTussDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigoTuss: CodigoTuss | null;
  onSuccess: () => void;
}

export function CodigoTussDeleteDialog({
  open,
  onOpenChange,
  codigoTuss,
  onSuccess,
}: CodigoTussDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!codigoTuss) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/codigos-tuss/${codigoTuss.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir código TUSS");
      }

      toast.success("Código TUSS excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir código TUSS"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Código TUSS?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o código TUSS{" "}
            <strong className="text-foreground">{codigoTuss?.codigoTuss}</strong> -{" "}
            <strong className="text-foreground">{codigoTuss?.descricao}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente o código TUSS do sistema.
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











