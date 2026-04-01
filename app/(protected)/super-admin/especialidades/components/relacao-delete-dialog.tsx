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

interface RelacaoItem {
  id: string;
  especialidade?: { codigo: string; nome: string };
  categoria?: { codigo: string; nome: string };
}

interface RelacaoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RelacaoItem | null;
  onSuccess: () => void;
  apiBasePath?: string;
}

export function RelacaoDeleteDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
  apiBasePath = "/api/super-admin/especialidades-categorias-itens",
}: RelacaoDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`${apiBasePath}/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir vínculo");
      toast.success("Vínculo excluído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir vínculo");
    } finally {
      setLoading(false);
    }
  };

  const labelEspecialidade = item?.especialidade ? `${item.especialidade.codigo} — ${item.especialidade.nome}` : "especialidade";
  const labelCategoria = item?.categoria ? `${item.categoria.codigo} — ${item.categoria.nome}` : "categoria";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir vínculo?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o vínculo entre <strong className="text-foreground">{labelEspecialidade}</strong> e{" "}
            <strong className="text-foreground">{labelCategoria}</strong>?
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

