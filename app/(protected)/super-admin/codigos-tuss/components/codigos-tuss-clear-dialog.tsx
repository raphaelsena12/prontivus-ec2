"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CodigosTussClearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CodigosTussClearDialog({
  open,
  onOpenChange,
  onSuccess,
}: CodigosTussClearDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canConfirm = confirmText.trim().toUpperCase() === "EXCLUIR";

  const handleClear = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/codigos-tuss/clear", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          const refs = data.refs as
            | {
                consultas?: number;
                tussValores?: number;
                guiasTissProcedimentos?: number;
              }
            | undefined;

          const refsText = refs
            ? Object.entries(refs)
                .filter(([, v]) => typeof v === "number" && v > 0)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : null;

          toast.error(
            refsText
              ? `${data.error || "Exclusão bloqueada."} (${refsText})`
              : data.error || "Exclusão bloqueada.",
            { duration: 9000 }
          );
          return;
        }

        throw new Error(data.error || "Erro ao excluir catálogo TUSS");
      }

      const deleted = data?.deleted as Record<string, number> | undefined;
      const deletedText = deleted
        ? Object.entries(deleted)
            .filter(([, v]) => typeof v === "number" && v > 0)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : null;

      toast.success(
        deletedText ? `Catálogo TUSS excluído. Removidos: ${deletedText}` : "Catálogo TUSS excluído."
      );

      setConfirmText("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir catálogo TUSS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir catálogo TUSS (em massa)
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove <strong>todos</strong> os códigos TUSS do sistema. Para confirmar, digite{" "}
            <strong>EXCLUIR</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirmText">Confirmação</Label>
          <Input
            id="confirmText"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={loading}
            placeholder="EXCLUIR"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Observação: se existirem consultas/guias/valores vinculados, a exclusão em massa é bloqueada para
            preservar o histórico.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={loading || !canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir em massa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

