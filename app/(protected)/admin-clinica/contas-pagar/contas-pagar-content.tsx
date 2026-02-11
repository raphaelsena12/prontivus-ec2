"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { ContasPagarTable } from "./components/contas-pagar-table";
import { ContaPagarDeleteDialog } from "./components/conta-pagar-delete-dialog";

interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor: string | null;
  valor: number;
  dataVencimento: Date;
  dataPagamento: Date | null;
  status: "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";
  observacoes: string | null;
}

interface ContasPagarContentProps {
  clinicaId: string;
}

export function ContasPagarContent({ clinicaId }: ContasPagarContentProps) {
  const router = useRouter();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ContaPagar | null>(null);

  const fetchContas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        limit: "1000", // Buscar todas para o TanStack Table gerenciar a paginação
      });
      const response = await fetch(`/api/admin-clinica/contas-pagar?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar contas a pagar");
      const data = await response.json();
      setContas(data.contas);
    } catch (error) {
      toast.error("Erro ao carregar contas a pagar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  const handleDeleteClick = (conta: ContaPagar) => {
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
              <p className="text-sm text-muted-foreground">Carregando contas a pagar...</p>
            </div>
          </div>
        ) : contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhuma conta a pagar encontrada</p>
          </div>
        ) : (
          <ContasPagarTable 
            data={contas} 
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/contas-pagar/novo"
          />
        )}
      </div>

      <ContaPagarDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        conta={contaToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
