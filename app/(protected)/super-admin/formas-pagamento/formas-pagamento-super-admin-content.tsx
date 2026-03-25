"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FormasPagamentoTable } from "@/app/(protected)/admin-clinica/formas-pagamento/components/formas-pagamento-table";
import { FormaPagamentoDialog } from "@/app/(protected)/admin-clinica/formas-pagamento/components/forma-pagamento-dialog";
import { FormaPagamentoDeleteDialog } from "@/app/(protected)/admin-clinica/formas-pagamento/components/forma-pagamento-delete-dialog";

interface FormaPagamento {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "PIX" | "BOLETO" | "TRANSFERENCIA";
  bandeiraCartao: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const API_BASE = "/api/super-admin/formas-pagamento";

export function FormasPagamentoSuperAdminContent() {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormaPagamento | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<FormaPagamento | null>(null);

  const fetchFormas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar formas de pagamento");
      const data = await res.json();
      setFormas(data.formasPagamento || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar formas de pagamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormas();
  }, [fetchFormas]);

  const handleSuccess = () => {
    fetchFormas();
    setDialogOpen(false);
    setDeleteOpen(false);
    setEditing(null);
    setToDelete(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={CreditCard}
        title="Formas de Pagamento (Global)"
        subtitle="Gerencie o catálogo global de formas de pagamento (usado por todos os tenants)"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <CardTitle className="text-sm font-semibold">Lista de Formas de Pagamento</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por nome..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64"
              />
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Nova Forma
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
          ) : formas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma forma de pagamento encontrada</p>
            </div>
          ) : (
            <FormasPagamentoTable
              data={formas}
              onEdit={(f) => {
                setEditing(f);
                setDialogOpen(true);
              }}
              onDelete={(f) => {
                setToDelete(f);
                setDeleteOpen(true);
              }}
              onCreate={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <FormaPagamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formaPagamento={editing}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <FormaPagamentoDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        formaPagamento={toDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />
    </div>
  );
}

