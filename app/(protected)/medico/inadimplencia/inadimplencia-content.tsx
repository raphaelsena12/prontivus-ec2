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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inadimplência</h1>
        <p className="text-muted-foreground">
          Contas a receber em atraso dos seus pacientes
        </p>
      </div>

      {resumo && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Inadimplente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(resumo.totalInadimplente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Quantidade de Contas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resumo.quantidadeContas}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Dias Médio de Atraso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resumo.diasMedioAtraso} dias
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por descrição ou paciente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas Inadimplentes</CardTitle>
          <CardDescription>
            Lista de contas a receber em atraso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : contas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conta inadimplente encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias em Atraso</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.map((conta) => {
                    const diasAtraso = calcularDiasAtraso(conta.dataVencimento);
                    return (
                      <TableRow key={conta.id}>
                        <TableCell>{conta.descricao}</TableCell>
                        <TableCell>{conta.paciente?.nome || "-"}</TableCell>
                        <TableCell>{conta.paciente?.cpf || "-"}</TableCell>
                        <TableCell>{formatCurrency(Number(conta.valor))}</TableCell>
                        <TableCell>
                          {formatDate(conta.dataVencimento)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {diasAtraso} dias
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{conta.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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













