"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Wallet, Filter, Search, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { FluxoCaixaTable } from "./components/fluxo-caixa-table";
import { MovimentacaoDeleteDialog } from "./components/movimentacao-delete-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Movimentacao {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  descricao: string;
  valor: number | string; // Pode vir como Decimal do Prisma (string) ou number
  data: string;
  formaPagamento: {
    id: string;
    nome: string;
  } | null;
  observacoes: string | null;
  createdAt: string;
}

interface FluxoCaixaContentProps {
  clinicaId: string;
}

export function FluxoCaixaContent({ clinicaId }: FluxoCaixaContentProps) {
  const router = useRouter();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimentacaoToDelete, setMovimentacaoToDelete] = useState<{ id: string; descricao: string; tipo: "ENTRADA" | "SAIDA"; valor: number } | null>(null);

  const fetchMovimentacoes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: "1000", // Buscar todas para o TanStack Table gerenciar a paginação
      });
      const response = await fetch(`/api/admin-clinica/fluxo-caixa?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar movimentações");
      const data = await response.json();
      setMovimentacoes(data.movimentacoes);
    } catch (error) {
      toast.error("Erro ao carregar movimentações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

  const handleDeleteClick = (movimentacao: { id: string; descricao: string; tipo: "ENTRADA" | "SAIDA"; valor: number }) => {
    setMovimentacaoToDelete({
      id: movimentacao.id,
      descricao: movimentacao.descricao,
      tipo: movimentacao.tipo,
      valor: movimentacao.valor,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchMovimentacoes();
  };

  const parseValor = (valor: number | string): number => {
    if (typeof valor === 'string') {
      const parsed = parseFloat(valor);
      return isNaN(parsed) ? 0 : parsed;
    }
    return isNaN(valor) || !isFinite(valor) ? 0 : valor;
  };

  const calcularSaldo = () => {
    return movimentacoes.reduce((acc, mov) => {
      const valor = parseValor(mov.valor);
      return mov.tipo === "ENTRADA" ? acc + valor : acc - valor;
    }, 0);
  };

  const calcularTotalEntradas = () => {
    return movimentacoes
      .filter((m) => m.tipo === "ENTRADA")
      .reduce((acc, m) => {
        const valor = parseValor(m.valor);
        return acc + valor;
      }, 0);
  };

  const calcularTotalSaidas = () => {
    return movimentacoes
      .filter((m) => m.tipo === "SAIDA")
      .reduce((acc, m) => {
        const valor = parseValor(m.valor);
        return acc + valor;
      }, 0);
  };

  const saldo = calcularSaldo();
  const totalEntradas = calcularTotalEntradas();
  const totalSaidas = calcularTotalSaidas();

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Wallet}
        title="Fluxo de Caixa"
        subtitle="Gerencie as movimentações financeiras da clínica"
      />

      {/* Cards de Resumo */}
      <div className="grid gap-4 mb-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
              {saldo >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalEntradas)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalSaidas)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Movimentações</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por descrição..." 
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
            <Select
              value={tipoFilter}
              onValueChange={setTipoFilter}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Data início"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-[150px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">até</span>
              <Input
                type="date"
                placeholder="Data fim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-[150px] h-8 text-xs"
              />
            </div>
            <Button onClick={() => router.push("/admin-clinica/fluxo-caixa/novo")} className="h-8 text-xs">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Nova Movimentação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando movimentações...</p>
              </div>
            </div>
          ) : movimentacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <FluxoCaixaTable 
            data={movimentacoes.map(m => ({ ...m, valor: parseValor(m.valor) }))} 
            tipoFilter={tipoFilter}
            onTipoFilterChange={setTipoFilter}
            dataInicio={dataInicio}
            onDataInicioChange={setDataInicio}
            dataFim={dataFim}
            onDataFimChange={setDataFim}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onDelete={handleDeleteClick}
          />
          )}
        </CardContent>
      </Card>

      <MovimentacaoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        movimentacao={movimentacaoToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
