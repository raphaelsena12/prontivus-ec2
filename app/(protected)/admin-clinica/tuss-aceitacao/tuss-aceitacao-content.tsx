"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { TussAceitacaoTable } from "./components/tuss-aceitacao-table";
import { TussAceitacaoDeleteDialog } from "./components/tuss-aceitacao-delete-dialog";

interface TussAceitacao {
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
  aceito: boolean;
  observacoes: string | null;
}

interface TussAceitacaoContentProps {
  clinicaId: string;
}

export function TussAceitacaoContent({ clinicaId }: TussAceitacaoContentProps) {
  const router = useRouter();
  const [aceitacoes, setAceitacoes] = useState<TussAceitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aceitacaoToDelete, setAceitacaoToDelete] = useState<TussAceitacao | null>(null);

  const fetchAceitacoes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/tuss-operadoras`);
      if (!response.ok) throw new Error("Erro ao carregar aceitações TUSS");
      const data = await response.json();
      setAceitacoes(data.tussOperadoras);
    } catch (error) {
      toast.error("Erro ao carregar aceitações TUSS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAceitacoes();
  }, [fetchAceitacoes]);

  const handleDeleteClick = (aceitacao: TussAceitacao) => {
    setAceitacaoToDelete(aceitacao);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchAceitacoes();
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando aceitações TUSS...</p>
            </div>
          </div>
        ) : aceitacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhuma aceitação TUSS encontrada</p>
          </div>
        ) : (
          <TussAceitacaoTable 
            data={aceitacoes} 
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/tuss-aceitacao/novo"
          />
        )}
      </div>

      <TussAceitacaoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        aceitacao={aceitacaoToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
