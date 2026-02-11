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

interface FormaPagamento {
  id: string;
  nome: string;
}

interface FormaPagamentoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formaPagamento: FormaPagamento | null;
  onSuccess: () => void;
}

export function FormaPagamentoDeleteDialog({
  open,
  onOpenChange,
  formaPagamento,
  onSuccess,
}: FormaPagamentoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!formaPagamento) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/formas-pagamento/${formaPagamento.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir forma de pagamento");
      }

      toast.success("Forma de pagamento excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir forma de pagamento"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Forma de Pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a forma de pagamento{" "}
            <strong className="text-foreground">{formaPagamento?.nome}</strong>?
            <br />
            <br />
            Esta ação irá remover permanentemente a forma de pagamento do sistema.
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











