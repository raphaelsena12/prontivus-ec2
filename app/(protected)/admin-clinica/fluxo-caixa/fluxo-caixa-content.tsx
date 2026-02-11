"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { FluxoCaixaTable } from "./components/fluxo-caixa-table";
import { MovimentacaoDeleteDialog } from "./components/movimentacao-delete-dialog";

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
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Resumo */}
        <div className="grid gap-4 px-4 lg:px-6 pt-2 pb-4 md:grid-cols-3">
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

        {loading ? (
          <div className="flex items-center justify-center py-12 px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando movimentações...</p>
            </div>
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 lg:px-6">
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
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/fluxo-caixa/novo"
          />
        )}
      </div>

      <MovimentacaoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        movimentacao={movimentacaoToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
