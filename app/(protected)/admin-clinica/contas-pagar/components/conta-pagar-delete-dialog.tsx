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

interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor: string | null;
  valor: number;
}

interface ContaPagarDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaPagar | null;
  onSuccess: () => void;
}

export function ContaPagarDeleteDialog({
  open,
  onOpenChange,
  conta,
  onSuccess,
}: ContaPagarDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!conta) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/contas-pagar/${conta.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir conta a pagar");
      }

      toast.success("Conta a pagar excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir conta a pagar"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta a Pagar?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a conta a pagar{" "}
            <strong className="text-foreground">{conta?.descricao}</strong>?
            {conta?.fornecedor && (
              <>
                <br />
                Fornecedor: <strong className="text-foreground">{conta.fornecedor}</strong>
              </>
            )}
            <br />
            <br />
            Esta ação irá remover permanentemente a conta a pagar do sistema.
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











