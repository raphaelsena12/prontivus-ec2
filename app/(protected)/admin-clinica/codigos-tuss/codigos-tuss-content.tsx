"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileCode } from "lucide-react";
import { toast } from "sonner";
import { CodigosTussTable } from "./components/codigos-tuss-table";
import { CodigoTussDeleteDialog } from "./components/codigo-tuss-delete-dialog";

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
  descricaoDetalhada: string | null;
  tipoProcedimento: string;
  dataVigenciaInicio: Date | string;
  dataVigenciaFim: Date | string | null;
  ativo: boolean;
  createdAt?: Date | string;
}

interface CodigosTussContentProps {
  clinicaId: string;
}

export function CodigosTussContent({ clinicaId }: CodigosTussContentProps) {
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codigoTussToDelete, setCodigoTussToDelete] = useState<CodigoTuss | null>(null);

  const fetchCodigosTuss = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/codigos-tuss`);
      if (!response.ok) throw new Error("Erro ao carregar códigos TUSS");
      const data = await response.json();
      // Converter strings de data para objetos Date de forma segura
      const codigosTussProcessados = (data.codigosTuss || []).map((codigo: any) => {
        let dataVigenciaInicio: Date | string = codigo.dataVigenciaInicio;
        let dataVigenciaFim: Date | string | null = codigo.dataVigenciaFim;
        let createdAt: Date | string | undefined = codigo.createdAt;

        try {
          if (codigo.dataVigenciaInicio) {
            dataVigenciaInicio = new Date(codigo.dataVigenciaInicio);
            if (isNaN(dataVigenciaInicio.getTime())) {
              dataVigenciaInicio = codigo.dataVigenciaInicio;
            }
          }
          if (codigo.dataVigenciaFim) {
            dataVigenciaFim = new Date(codigo.dataVigenciaFim);
            if (isNaN(dataVigenciaFim.getTime())) {
              dataVigenciaFim = codigo.dataVigenciaFim;
            }
          }
          if (codigo.createdAt) {
            createdAt = new Date(codigo.createdAt);
            if (isNaN(createdAt.getTime())) {
              createdAt = codigo.createdAt;
            }
          }
        } catch (e) {
          // Se houver erro na conversão, manter como string
        }

        return {
          ...codigo,
          dataVigenciaInicio,
          dataVigenciaFim,
          createdAt,
        };
      });
      setCodigosTuss(codigosTussProcessados);
    } catch (error) {
      toast.error("Erro ao carregar códigos TUSS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodigosTuss();
  }, [fetchCodigosTuss]);

  const handleDeleteClick = (codigoTuss: CodigoTuss) => {
    setCodigoTussToDelete(codigoTuss);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchCodigosTuss();
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando códigos TUSS...</p>
            </div>
          </div>
        ) : codigosTuss.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhum código TUSS encontrado</p>
          </div>
        ) : (
          <CodigosTussTable 
            data={codigosTuss} 
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/codigos-tuss/novo"
          />
        )}
      </div>

      <CodigoTussDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        codigoTuss={codigoTussToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
