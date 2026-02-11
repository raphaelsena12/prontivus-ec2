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

interface ContaReceber {
  id: string;
  descricao: string;
  paciente: {
    nome: string;
  } | null;
  valor: number;
}

interface ContaReceberDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaReceber | null;
  onSuccess: () => void;
}

export function ContaReceberDeleteDialog({
  open,
  onOpenChange,
  conta,
  onSuccess,
}: ContaReceberDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!conta) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/contas-receber/${conta.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir conta a receber");
      }

      toast.success("Conta a receber excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir conta a receber"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta a Receber?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a conta a receber{" "}
            <strong className="text-foreground">{conta?.descricao}</strong>?
            {conta?.paciente && (
              <>
                <br />
                Paciente: <strong className="text-foreground">{conta.paciente.nome}</strong>
              </>
            )}
            <br />
            <br />
            Esta ação irá remover permanentemente a conta a receber do sistema.
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











