"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Upload, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormasPagamentoTable } from "./components/formas-pagamento-table";
import { FormaPagamentoDeleteDialog } from "./components/forma-pagamento-delete-dialog";
import { FormaPagamentoDialog } from "./components/forma-pagamento-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Formas de Pagamento</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie as formas de pagamento disponíveis na clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Formas de Pagamento</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Nova Forma de Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando formas de pagamento...</p>
              </div>
            </div>
          ) : formasPagamento.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
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
        </CardContent>
      </Card>

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
