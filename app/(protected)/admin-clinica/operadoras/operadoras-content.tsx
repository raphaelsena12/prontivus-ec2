"use client";

import { getApiErrorMessage } from "@/lib/zod-validation-error";
import { useState, useEffect, useCallback } from "react";
import { Building2, Filter, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";

interface Operadora {
  id: string;
  codigoAns: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  planosSaude: Array<{ id: string; nome: string }>;
  aceitaNaClinica: boolean;
  isGlobal: boolean;
}

interface OperadorasContentProps {
  clinicaId: string;
}

export function OperadorasContent({ clinicaId }: OperadorasContentProps) {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const fetchOperadoras = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        ...(search && { search }) 
      });
      const response = await fetch(`/api/admin-clinica/operadoras?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar operadoras");
      const data = await response.json();
      setOperadoras(data.operadoras);
    } catch (error) {
      toast.error("Erro ao carregar operadoras");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOperadoras();
  }, [fetchOperadoras]);

  // Quando a busca mudar, voltar para a primeira página
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search]);

  const filtered = operadoras; // a API já busca com o filtro; aqui mantemos o array pronto
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));
  const paged = filtered.slice(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageIndex * pagination.pageSize + pagination.pageSize
  );

  const toggleAceitacao = async (operadoraId: string, aceita: boolean) => {
    try {
      // optimistic UI
      setOperadoras((prev) =>
        prev.map((o) => (o.id === operadoraId ? { ...o, aceitaNaClinica: aceita } : o))
      );

      const res = await fetch(`/api/admin-clinica/operadoras/${operadoraId}/aceitacao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceita }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(data) || "Erro ao atualizar aceitação da operadora"
        );
      }
      toast.success(aceita ? "Operadora marcada como aceita" : "Operadora desmarcada");
    } catch (err: any) {
      // rollback
      setOperadoras((prev) =>
        prev.map((o) => (o.id === operadoraId ? { ...o, aceitaNaClinica: !aceita } : o))
      );
      toast.error(err?.message || "Erro ao atualizar aceitação");
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Building2}
        title="Operadoras"
        subtitle="Selecione quais operadoras (catálogo) a sua clínica aceita"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Operadoras</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por código ANS, razão social ou fantasia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-80"
              />
            </div>
            <Button
              variant="outline"
              disabled
              className="h-8 text-xs px-3"
              title="Cadastro global é feito pelo Super Admin"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Nova Operadora
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando operadoras...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma operadora encontrada</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="overflow-hidden px-6 pt-6">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-semibold py-3">Aceita</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Código ANS</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Razão Social</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Nome Fantasia</TableHead>
                      <TableHead className="text-xs font-semibold py-3">CNPJ</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((operadora) => (
                      <TableRow key={operadora.id}>
                        <TableCell className="text-xs py-3">
                          <Switch
                            checked={operadora.aceitaNaClinica}
                            onCheckedChange={(checked) => toggleAceitacao(operadora.id, checked)}
                            aria-label={`Aceitar operadora ${operadora.razaoSocial}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs py-3 font-medium">{operadora.codigoAns}</TableCell>
                        <TableCell className="text-xs py-3">{operadora.razaoSocial}</TableCell>
                        <TableCell className="text-xs py-3">{operadora.nomeFantasia || "-"}</TableCell>
                        <TableCell className="text-xs py-3">{operadora.cnpj || "-"}</TableCell>
                        <TableCell className="text-xs py-3">
                          {operadora.ativo ? (
                            <Badge
                              variant="outline"
                              className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight"
                            >
                              <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight"
                            >
                              <IconLoader className="mr-1 h-3 w-3" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          {operadora.isGlobal ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
                              Catálogo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
                              Legado (clínica)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Rodapé (mesmo padrão das demais tabelas) */}
              <div className="flex items-center justify-between px-6 pb-6">
                <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
                  {filtered.length} operadora(s) encontrada(s).
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="rows-per-page" className="text-xs font-medium">
                      Linhas por página
                    </Label>
                    <Select
                      value={`${pagination.pageSize}`}
                      onValueChange={(value) => {
                        const size = Number(value);
                        setPagination({ pageIndex: 0, pageSize: size });
                      }}
                    >
                      <SelectTrigger size="sm" className="w-20 h-7 text-xs" id="rows-per-page">
                        <SelectValue placeholder={pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-fit items-center justify-center text-xs font-medium">
                    Página {pagination.pageIndex + 1} de {pageCount}
                  </div>
                  <div className="ml-auto flex items-center gap-2 lg:ml-0">
                    <Button
                      variant="outline"
                      className="hidden h-7 w-7 p-0 lg:flex text-xs"
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                      disabled={pagination.pageIndex === 0}
                    >
                      <span className="sr-only">Primeira página</span>
                      <IconChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-7 w-7 text-xs"
                      size="icon"
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                      disabled={pagination.pageIndex === 0}
                    >
                      <span className="sr-only">Página anterior</span>
                      <IconChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-7 w-7 text-xs"
                      size="icon"
                      onClick={() =>
                        setPagination((p) => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))
                      }
                      disabled={pagination.pageIndex >= pageCount - 1}
                    >
                      <span className="sr-only">Próxima página</span>
                      <IconChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      className="hidden h-7 w-7 lg:flex text-xs"
                      size="icon"
                      onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
                      disabled={pagination.pageIndex >= pageCount - 1}
                    >
                      <span className="sr-only">Última página</span>
                      <IconChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
