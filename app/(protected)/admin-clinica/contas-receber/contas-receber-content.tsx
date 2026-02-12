"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Filter, Receipt, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { ContasReceberTable } from "./components/contas-receber-table";
import { ContaReceberDeleteDialog } from "./components/conta-receber-delete-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [globalFilter, setGlobalFilter] = useState<string>("");
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
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Contas a Receber</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie as contas a receber da clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Contas a Receber</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por descrição ou paciente..." 
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="RECEBIDO">Recebido</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => router.push("/admin-clinica/contas-receber/novo")} className="h-8 text-xs">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Nova Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando contas a receber...</p>
              </div>
            </div>
          ) : contas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma conta a receber encontrada</p>
            </div>
          ) : (
            <ContasReceberTable 
            data={contas} 
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onDelete={handleDeleteClick}
          />
          )}
        </CardContent>
      </Card>

      <ContaReceberDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        conta={contaToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
