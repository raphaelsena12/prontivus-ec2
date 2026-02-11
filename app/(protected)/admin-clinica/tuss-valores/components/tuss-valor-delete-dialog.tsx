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

interface TussValor {
  id: string;
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  };
  valor: number;
}

interface TussValorDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valor: TussValor | null;
  onSuccess: () => void;
}

export function TussValorDeleteDialog({
  open,
  onOpenChange,
  valor,
  onSuccess,
}: TussValorDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!valor) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/tuss-valores/${valor.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir valor TUSS");
      }

      toast.success("Valor TUSS excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir valor TUSS"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Valor TUSS?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o valor TUSS{" "}
            <strong className="text-foreground">{valor?.codigoTuss.codigoTuss}</strong> -{" "}
            <strong className="text-foreground">{valor?.codigoTuss.descricao}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente o valor TUSS do sistema.
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











