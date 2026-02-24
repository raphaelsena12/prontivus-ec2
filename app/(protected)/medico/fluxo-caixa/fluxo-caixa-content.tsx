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
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Filter, Search, Calendar, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";

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
  const router = useRouter();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(tipo && tipo !== "all" && { tipo }),
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
    if (tipo === "ENTRADA") {
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <TrendingUp className="mr-1 h-3 w-3" />
          Entrada
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <TrendingDown className="mr-1 h-3 w-3" />
          Saída
        </Badge>
      );
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Wallet}
        title="Fluxo de Caixa"
        subtitle="Gerencie as movimentações financeiras"
      />

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
              value={tipo}
              onValueChange={(value) => {
                setTipo(value);
                setPage(1);
              }}
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
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPage(1);
                }}
                className="w-[150px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">até</span>
              <Input
                type="date"
                placeholder="Data fim"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPage(1);
                }}
                className="w-[150px] h-8 text-xs"
              />
            </div>
            <Button onClick={() => router.push("/medico/fluxo-caixa/novo")} className="h-8 text-xs">
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
            <>
              <div className="overflow-x-auto px-6 pt-6">
                <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold py-3">Data</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Descrição</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Valor</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Forma de Pagamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimentacoes.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell className="text-xs py-3">{formatDate(mov.data)}</TableCell>
                              <TableCell className="text-xs py-3">{getTipoBadge(mov.tipo)}</TableCell>
                              <TableCell className="text-xs py-3">{mov.descricao}</TableCell>
                              <TableCell className="text-xs py-3">{formatCurrency(Number(mov.valor))}</TableCell>
                              <TableCell className="text-xs py-3">
                                {mov.formaPagamento?.nome || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 px-6 pb-6 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded disabled:opacity-50 text-xs"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2 text-xs">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded disabled:opacity-50 text-xs"
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













