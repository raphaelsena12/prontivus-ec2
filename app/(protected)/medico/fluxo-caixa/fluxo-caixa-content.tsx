"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";

interface Movimentacao {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
  formaPagamento: {
    id: string;
    nome: string;
  } | null;
  observacoes: string | null;
}

export function FluxoCaixaContent() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(tipo && { tipo }),
          ...(dataInicio && { dataInicio }),
          ...(dataFim && { dataFim }),
        });
        const response = await fetch(
          `/api/medico/fluxo-caixa?${params.toString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setMovimentacoes(data.movimentacoes);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (error) {
        console.error("Erro ao buscar movimentações:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tipo, dataInicio, dataFim, page]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === "ENTRADA" ? "default" : "destructive"}>
        {tipo}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as movimentações financeiras
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Select
            value={tipo}
            onValueChange={(value) => {
              setTipo(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              <SelectItem value="ENTRADA">Entrada</SelectItem>
              <SelectItem value="SAIDA">Saída</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="Data início"
            value={dataInicio}
            onChange={(e) => {
              setDataInicio(e.target.value);
              setPage(1);
            }}
            className="w-[180px]"
          />
          <Input
            type="date"
            placeholder="Data fim"
            value={dataFim}
            onChange={(e) => {
              setDataFim(e.target.value);
              setPage(1);
            }}
            className="w-[180px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
          <CardDescription>
            Lista de todas as movimentações de caixa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : movimentacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma de Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatDate(mov.data)}</TableCell>
                      <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                      <TableCell>{mov.descricao}</TableCell>
                      <TableCell>{formatCurrency(Number(mov.valor))}</TableCell>
                      <TableCell>
                        {mov.formaPagamento?.nome || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}













