"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Upload } from "lucide-react";
import { toast } from "sonner";
import { FormasPagamentoTable } from "./components/formas-pagamento-table";
import { FormaPagamentoDeleteDialog } from "./components/forma-pagamento-delete-dialog";
import { FormaPagamentoDialog } from "./components/forma-pagamento-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface FormaPagamento {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "PIX" | "BOLETO" | "TRANSFERENCIA";
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FormasPagamentoContentProps {
  clinicaId: string;
}

export function FormasPagamentoContent({ clinicaId }: FormasPagamentoContentProps) {
  const router = useRouter();
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [formaPagamentoDialogOpen, setFormaPagamentoDialogOpen] = useState(false);
  const [editingFormaPagamento, setEditingFormaPagamento] = useState<FormaPagamento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formaPagamentoToDelete, setFormaPagamentoToDelete] = useState<FormaPagamento | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchFormasPagamento = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/formas-pagamento?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar formas de pagamento");
      const data = await response.json();
      setFormasPagamento(data.formasPagamento || []);
    } catch (error) {
      toast.error("Erro ao carregar formas de pagamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormasPagamento();
  }, [fetchFormasPagamento]);

  const handleEdit = (formaPagamento: FormaPagamento) => {
    setEditingFormaPagamento(formaPagamento);
    setFormaPagamentoDialogOpen(true);
  };

  const handleDeleteClick = (formaPagamento: FormaPagamento) => {
    setFormaPagamentoToDelete(formaPagamento);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchFormasPagamento();
    setFormaPagamentoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingFormaPagamento(null);
    setFormaPagamentoToDelete(null);
  };

  const handleCreate = () => {
    setEditingFormaPagamento(null);
    setFormaPagamentoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando formas de pagamento...</p>
            </div>
          </div>
        ) : formasPagamento.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
            <p className="text-muted-foreground text-center">Nenhuma forma de pagamento encontrada</p>
          </div>
        ) : (
          <FormasPagamentoTable 
            data={formasPagamento} 
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
            onUpload={() => setUploadDialogOpen(true)}
          />
        )}
      </div>

      <FormaPagamentoDialog
        open={formaPagamentoDialogOpen}
        onOpenChange={setFormaPagamentoDialogOpen}
        formaPagamento={editingFormaPagamento}
        onSuccess={handleSuccess}
      />

      <FormaPagamentoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        formaPagamento={formaPagamentoToDelete}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/formas-pagamento"
        title="Upload de Formas de Pagamento em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados das formas de pagamento. O arquivo deve conter colunas: nome, descricao, tipo (DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, BOLETO, TRANSFERENCIA), etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
