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

interface Movimentacao {
  id: string;
  descricao: string;
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
}

interface MovimentacaoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimentacao: Movimentacao | null;
  onSuccess: () => void;
}

export function MovimentacaoDeleteDialog({
  open,
  onOpenChange,
  movimentacao,
  onSuccess,
}: MovimentacaoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!movimentacao) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/fluxo-caixa/${movimentacao.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir movimentação");
      }

      toast.success("Movimentação excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir movimentação"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Movimentação?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a movimentação{" "}
            <strong className="text-foreground">{movimentacao?.descricao}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente a movimentação do sistema.
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











