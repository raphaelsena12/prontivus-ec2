"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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

export function CodigoTussDeleteDialogSuperAdmin({
  open,
  onOpenChange,
  codigoTuss,
  onSuccess,
}: CodigoTussDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [cascade, setCascade] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (!codigoTuss) return;
    try {
      setLoading(true);

      const url = cascade
        ? `/api/super-admin/codigos-tuss/${codigoTuss.id}?cascade=true`
        : `/api/super-admin/codigos-tuss/${codigoTuss.id}`;

      const response = await fetch(url, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        // Mensagem amigável para código em uso (409)
        if (response.status === 409) {
          const refs = error.refs as
            | {
                tussValores?: number;
                tussOperadoras?: number;
                consultas?: number;
                guiasTissProcedimentos?: number;
                exames?: number;
              }
            | undefined;

          const refsText = refs
            ? Object.entries(refs)
                .filter(([, v]) => typeof v === "number" && v > 0)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : null;

          const msg =
            error.error ||
            "Não é possível excluir este Código TUSS porque ele está sendo usado. Inative o código ao invés de excluir.";

          toast.error(refsText ? `${msg} (${refsText})` : msg, { duration: 8000 });
          setLoading(false);
          return;
        }

        throw new Error(error.error || "Erro ao excluir código TUSS");
      }
      const data = await response.json().catch(() => ({}));

      if (cascade && data?.deleted) {
        const deleted = data.deleted as Record<string, number>;
        const deletedText = Object.entries(deleted)
          .filter(([, v]) => typeof v === "number" && v > 0)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        toast.success(
          deletedText
            ? `Código TUSS excluído (cascade). Removidos: ${deletedText}`
            : "Código TUSS excluído (cascade)."
        );
      } else {
        toast.success("Código TUSS excluído com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir código TUSS");
    } finally {
      setLoading(false);
    }
  };

  const canCascadeConfirm = !cascade || confirmText.trim().toUpperCase() === "EXCLUIR";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Código TUSS
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o código TUSS <strong>{codigoTuss?.codigoTuss}</strong> —{" "}
            {codigoTuss?.descricao}? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="cascade"
              type="checkbox"
              checked={cascade}
              onChange={(e) => {
                setCascade(e.target.checked);
                setConfirmText("");
              }}
              disabled={loading}
              className="h-4 w-4"
            />
            <Label htmlFor="cascade" className="text-sm">
              Excluir em cascata (remove vínculos como valores/aceitação e pode apagar consultas relacionadas)
            </Label>
          </div>

          {cascade && (
            <div className="space-y-2">
              <Label htmlFor="confirmText">
                Digite <strong>EXCLUIR</strong> para confirmar o cascade
              </Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={loading}
                placeholder="EXCLUIR"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || !canCascadeConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cascade ? "Excluir (cascade)" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

