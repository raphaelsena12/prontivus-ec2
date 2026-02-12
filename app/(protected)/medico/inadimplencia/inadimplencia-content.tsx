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
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Filter, Search } from "lucide-react";
import { IconAlertCircle } from "@tabler/icons-react";

interface ContaReceber {
  id: string;
  descricao: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
  } | null;
  valor: number;
  dataVencimento: string;
  formaPagamento: {
    id: string;
    nome: string;
  } | null;
  status: string;
}

interface Resumo {
  totalInadimplente: number;
  quantidadeContas: number;
  diasMedioAtraso: number;
}

export function InadimplenciaContent() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(search && { search }),
        });
        const response = await fetch(
          `/api/medico/inadimplencia?${params.toString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setContas(data.contas);
          setResumo(data.resumo);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (error) {
        console.error("Erro ao buscar inadimplência:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [search, page]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const calcularDiasAtraso = (dataVencimento: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diffTime = hoje.getTime() - vencimento.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Inadimplência</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie as contas em atraso
        </p>
      </div>

      {/* Cards de Resumo */}
      {resumo && (
        <div className="grid gap-4 mb-6 md:grid-cols-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-medium">
                Total Inadimplente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">
                {formatCurrency(resumo.totalInadimplente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-medium">
                Quantidade de Contas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">
                {resumo.quantidadeContas}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-medium">
                Dias Médio de Atraso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">
                {resumo.diasMedioAtraso} dias
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Contas Inadimplentes</CardTitle>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              type="search"
              placeholder="Buscar por descrição ou paciente..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-8 text-xs bg-background w-64" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando contas inadimplentes...</p>
              </div>
            </div>
          ) : contas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma conta inadimplente encontrada</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto px-6 pt-6">
                <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold py-3">Descrição</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                            <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Valor</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Vencimento</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Dias em Atraso</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contas.map((conta) => {
                            const diasAtraso = calcularDiasAtraso(conta.dataVencimento);
                            return (
                              <TableRow key={conta.id}>
                                <TableCell className="text-xs py-3">{conta.descricao}</TableCell>
                                <TableCell className="text-xs py-3">{conta.paciente?.nome || "-"}</TableCell>
                                <TableCell className="text-xs py-3">{conta.paciente?.cpf || "-"}</TableCell>
                                <TableCell className="text-xs py-3">{formatCurrency(Number(conta.valor))}</TableCell>
                                <TableCell className="text-xs py-3">
                                  {formatDate(conta.dataVencimento)}
                                </TableCell>
                                <TableCell className="text-xs py-3">
                                  <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
                                    <IconAlertCircle className="mr-1 h-3 w-3" />
                                    {diasAtraso} dias
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-3">
                                  <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
                                    <IconAlertCircle className="mr-1 h-3 w-3" />
                                    {conta.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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













