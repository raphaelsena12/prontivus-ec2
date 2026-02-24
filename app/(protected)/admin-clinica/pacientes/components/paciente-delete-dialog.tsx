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
  ativo: boolean;
}

interface PacienteToggleStatusDialogProps {
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
}: PacienteToggleStatusDialogProps) {
  const [loading, setLoading] = useState(false);

  const isDeactivating = paciente?.ativo !== false;

  const handleToggleStatus = async () => {
    if (!paciente) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/admin-clinica/pacientes/${paciente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !paciente.ativo }),
      });

      if (!response.ok) {
        let errorMessage = isDeactivating
          ? "Erro ao desativar paciente"
          : "Erro ao reativar paciente";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (response.status === 401) {
            errorMessage = "Não autenticado. Por favor, faça login novamente.";
          } else if (response.status === 403) {
            errorMessage = "Acesso negado. Você não tem permissão.";
          } else if (response.status === 404) {
            errorMessage = "Paciente não encontrado.";
          }
        }
        throw new Error(errorMessage);
      }

      toast.success(
        isDeactivating
          ? "Paciente desativado com sucesso!"
          : "Paciente reativado com sucesso!"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao alterar status do paciente:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar status do paciente"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? "Desativar Paciente?" : "Reativar Paciente?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivating ? (
              <>
                Tem certeza que deseja desativar o paciente{" "}
                <strong className="text-foreground">{paciente?.nome}</strong>?
                <br />
                <br />
                O paciente será marcado como inativo e não aparecerá nas listagens padrão,
                mas seus dados serão mantidos no sistema.
              </>
            ) : (
              <>
                Deseja reativar o paciente{" "}
                <strong className="text-foreground">{paciente?.nome}</strong>?
                <br />
                <br />
                O paciente voltará a aparecer nas listagens e poderá ser utilizado normalmente.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleToggleStatus();
            }}
            disabled={loading}
            className={
              isDeactivating
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeactivating ? "Desativar" : "Reativar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
