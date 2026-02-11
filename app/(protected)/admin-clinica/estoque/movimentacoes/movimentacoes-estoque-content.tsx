"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NovaMovimentacaoEstoqueDialog } from "./nova-movimentacao-dialog";

interface Movimentacao {
  id: string;
  estoque: {
    medicamento: { nome: string };
  };
  tipo: string;
  quantidade: number;
  motivo: string | null;
  data: Date;
}

interface MovimentacoesEstoqueContentProps {
  clinicaId: string;
  estoques: Array<{ id: string; medicamento: { nome: string } }>;
}

export function MovimentacoesEstoqueContent({ clinicaId, estoques }: MovimentacoesEstoqueContentProps) {
  const router = useRouter();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [estoqueFilter, setEstoqueFilter] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchMovimentacoes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "10", ...(estoqueFilter && { estoqueId: estoqueFilter }), ...(tipoFilter && { tipo: tipoFilter }) });
      const response = await fetch(`/api/admin-clinica/estoque/movimentacoes?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar movimentações");
      const data = await response.json();
      setMovimentacoes(data.movimentacoes);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error("Erro ao carregar movimentações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimentacoes();
  }, [page, estoqueFilter, tipoFilter]);

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ENTRADA: "default",
      SAIDA: "destructive",
      AJUSTE: "secondary",
    };
    return <Badge variant={variants[tipo] || "outline"}>{tipo}</Badge>;
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold">Movimentações de Estoque</h1>
            <p className="text-muted-foreground">Gerencie as movimentações de estoque</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Movimentação
          </Button>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <Select value={estoqueFilter} onValueChange={(value) => { setEstoqueFilter(value); setPage(1); }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todos os medicamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os medicamentos</SelectItem>
              {estoques.map((estoque) => (
                <SelectItem key={estoque.id} value={estoque.id}>{estoque.medicamento.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={(value) => { setTipoFilter(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              <SelectItem value="ENTRADA">Entrada</SelectItem>
              <SelectItem value="SAIDA">Saída</SelectItem>
              <SelectItem value="AJUSTE">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
              ) : movimentacoes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center">Nenhuma movimentação encontrada</TableCell></TableRow>
              ) : (
                movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDate(mov.data)}</TableCell>
                    <TableCell className="font-medium">{mov.estoque.medicamento.nome}</TableCell>
                    <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                    <TableCell className="font-medium">{mov.quantidade}</TableCell>
                    <TableCell>{mov.motivo || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 lg:px-6">
            <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      <NovaMovimentacaoEstoqueDialog open={dialogOpen} onOpenChange={setDialogOpen} estoques={estoques} onSuccess={fetchMovimentacoes} />
    </div>
  );
}


