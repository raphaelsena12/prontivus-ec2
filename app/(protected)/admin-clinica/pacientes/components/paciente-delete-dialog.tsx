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

interface Paciente {
  id: string;
  nome: string;
}

interface PacienteDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
  onSuccess: () => void;
}

export function PacienteDeleteDialog({
  open,
  onOpenChange,
  paciente,
  onSuccess,
}: PacienteDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!paciente) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/pacientes/${paciente.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "Erro ao excluir paciente";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear JSON, usar mensagem padrão baseada no status
          if (response.status === 401) {
            errorMessage = "Não autenticado. Por favor, faça login novamente.";
          } else if (response.status === 403) {
            errorMessage = "Acesso negado. Você não tem permissão para excluir pacientes.";
          } else if (response.status === 404) {
            errorMessage = "Paciente não encontrado.";
          } else {
            errorMessage = `Erro ao excluir paciente (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.success(data.message || "Paciente excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir paciente"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o paciente{" "}
            <strong className="text-foreground">{paciente?.nome}</strong>?
            <br />
            <br />
            Esta ação irá desativar o paciente no sistema.
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










