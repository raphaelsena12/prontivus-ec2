"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { ContasReceberTable } from "./components/contas-receber-table";
import { ContaReceberDeleteDialog } from "./components/conta-receber-delete-dialog";

interface ContaReceber {
  id: string;
  descricao: string;
  paciente: {
    id: string;
    nome: string;
  } | null;
  valor: number;
  dataVencimento: Date;
  dataRecebimento: Date | null;
  status: "PENDENTE" | "RECEBIDO" | "VENCIDO" | "CANCELADO";
  observacoes: string | null;
}

interface ContasReceberContentProps {
  clinicaId: string;
}

export function ContasReceberContent({ clinicaId }: ContasReceberContentProps) {
  const router = useRouter();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ContaReceber | null>(null);

  const fetchContas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        limit: "1000", // Buscar todas para o TanStack Table gerenciar a paginação
      });
      const response = await fetch(`/api/admin-clinica/contas-receber?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar contas a receber");
      const data = await response.json();
      setContas(data.contas);
    } catch (error) {
      toast.error("Erro ao carregar contas a receber");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  const handleDeleteClick = (conta: ContaReceber) => {
    setContaToDelete(conta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchContas();
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando contas a receber...</p>
            </div>
          </div>
        ) : contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhuma conta a receber encontrada</p>
          </div>
        ) : (
          <ContasReceberTable 
            data={contas} 
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/contas-receber/novo"
          />
        )}
      </div>

      <ContaReceberDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        conta={contaToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
