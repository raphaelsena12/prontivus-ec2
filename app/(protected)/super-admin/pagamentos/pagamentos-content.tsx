"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Filter } from "lucide-react";
import { StatusPagamento } from "@/lib/generated/prisma/enums";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PagamentosTable } from "@/components/pagamentos-table";
import { PagamentoDialog } from "./pagamento-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

interface Pagamento {
  id: string;
  tenantId: string;
  clinicaNome: string;
  clinicaCnpj: string;
  valor: number;
  mesReferencia: Date;
  status: StatusPagamento;
  metodoPagamento: string | null;
  transacaoId: string | null;
  dataPagamento: Date | null;
  dataVencimento: Date;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  planoNome: string;
}

interface Clinica {
  id: string;
  nome: string;
  plano: {
    id: string;
    preco: number;
  };
}

interface PagamentosContentProps {
  pagamentos: Pagamento[];
  clinicas: Clinica[];
}

export function PagamentosContent({
  pagamentos: initialPagamentos,
  clinicas,
}: PagamentosContentProps) {
  const [pagamentos, setPagamentos] = useState(initialPagamentos);
  const [dialogConfirmarOpen, setDialogConfirmarOpen] = useState(false);
  const [dialogNovoPagamentoOpen, setDialogNovoPagamentoOpen] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] =
    useState<Pagamento | null>(null);
  const [isConfirmando, setIsConfirmando] = useState(false);

  const handleConfirmarPagamento = async () => {
    if (!pagamentoSelecionado) return;

    setIsConfirmando(true);

    try {
      const response = await fetch(
        `/api/super-admin/pagamentos/${pagamentoSelecionado.id}/confirmar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transacaoId: pagamentoSelecionado.transacaoId || undefined,
            dataPagamento: new Date().toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao confirmar pagamento");
      }

      toast.success("Pagamento confirmado e licença renovada com sucesso!");
      setDialogConfirmarOpen(false);
      setPagamentoSelecionado(null);

      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erro ao confirmar pagamento");
    } finally {
      setIsConfirmando(false);
    }
  };

  const handleConfirmar = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setDialogConfirmarOpen(true);
  };

  const handleNovoPagamentoSuccess = () => {
    // Recarregar página para atualizar dados
    window.location.reload();
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={DollarSign}
        title="Pagamentos"
        subtitle="Gerencie os pagamentos e renovações de licenças das clínicas"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Pagamentos</CardTitle>
          </div>
          <Button
            onClick={() => setDialogNovoPagamentoOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 text-xs px-3"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Novo Pagamento
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <PagamentosTable data={pagamentos} onConfirmar={handleConfirmar} />
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <Dialog
        open={dialogConfirmarOpen}
        onOpenChange={setDialogConfirmarOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Ao confirmar este pagamento, a licença da clínica será
              renovada automaticamente por mais 1 mês.
            </DialogDescription>
          </DialogHeader>
          {pagamentoSelecionado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Clínica</Label>
                  <p className="text-sm font-medium">
                    {pagamentoSelecionado.clinicaNome}
                  </p>
                </div>
                <div>
                  <Label>Valor</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(pagamentoSelecionado.valor)}
                  </p>
                </div>
                <div>
                  <Label>Mês Referência</Label>
                  <p className="text-sm font-medium">
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "long",
                      year: "numeric",
                    }).format(
                      new Date(pagamentoSelecionado.mesReferencia)
                    )}
                  </p>
                </div>
                <div>
                  <Label>Método de Pagamento</Label>
                  <p className="text-sm font-medium">
                    {pagamentoSelecionado.metodoPagamento || "Não informado"}
                  </p>
                </div>
              </div>
              {pagamentoSelecionado.transacaoId && (
                <div>
                  <Label>ID da Transação</Label>
                  <p className="text-sm font-mono">
                    {pagamentoSelecionado.transacaoId}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogConfirmarOpen(false);
                setPagamentoSelecionado(null);
              }}
              disabled={isConfirmando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPagamento}
              disabled={isConfirmando}
            >
              {isConfirmando ? "Confirmando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Pagamento */}
      <PagamentoDialog
        open={dialogNovoPagamentoOpen}
        onOpenChange={setDialogNovoPagamentoOpen}
        onSuccess={handleNovoPagamentoSuccess}
        clinicas={clinicas}
      />
    </div>
  );
}

