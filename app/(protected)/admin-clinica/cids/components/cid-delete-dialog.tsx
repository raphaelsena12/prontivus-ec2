"use client";
import { getApiErrorMessage } from "@/lib/zod-validation-error";

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

interface Cid {
  id: string;
  codigo: string;
  descricao: string;
}

interface CidDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cid: Cid | null;
  onSuccess: () => void;
  apiBasePath?: string;
}

export function CidDeleteDialog({
  open,
  onOpenChange,
  cid,
  onSuccess,
  apiBasePath = "/api/admin-clinica/cids",
}: CidDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!cid) return;
    try {
      setLoading(true);
      const response = await fetch(`${apiBasePath}/${cid.id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(getApiErrorMessage(error) || "Erro ao excluir CID");
      }
      toast.success("CID excluido com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir CID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir CID
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o CID <strong>{cid?.codigo}</strong> - {cid?.descricao}?
            Esta acao nao pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
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
