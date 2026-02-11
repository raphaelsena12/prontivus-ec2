"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { TussValoresTable } from "./components/tuss-valores-table";
import { TussValorDeleteDialog } from "./components/tuss-valor-delete-dialog";

interface TussValor {
  id: string;
  codigoTuss: {
    id: string;
    codigoTuss: string;
    descricao: string;
  };
  operadora: {
    id: string;
    razaoSocial: string;
  } | null;
  planoSaude: {
    id: string;
    nome: string;
  } | null;
  tipoConsulta: {
    id: string;
    nome: string;
  } | null;
  valor: number;
  dataVigenciaInicio: Date;
  dataVigenciaFim: Date | null;
  ativo: boolean;
  observacoes: string | null;
}

interface TussValoresContentProps {
  clinicaId: string;
}

export function TussValoresContent({ clinicaId }: TussValoresContentProps) {
  const router = useRouter();
  const [valores, setValores] = useState<TussValor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [valorToDelete, setValorToDelete] = useState<TussValor | null>(null);

  const fetchValores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/tuss-valores`);
      if (!response.ok) throw new Error("Erro ao carregar valores TUSS");
      const data = await response.json();
      setValores(data.valores);
    } catch (error) {
      toast.error("Erro ao carregar valores TUSS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValores();
  }, [fetchValores]);

  const handleDeleteClick = (valor: TussValor) => {
    setValorToDelete(valor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchValores();
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando valores TUSS...</p>
            </div>
          </div>
        ) : valores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum valor TUSS encontrado</p>
          </div>
        ) : (
          <TussValoresTable 
            data={valores} 
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/tuss-valores/novo"
          />
        )}
      </div>

      <TussValorDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        valor={valorToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
