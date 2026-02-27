"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLoader,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, FileText, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate, formatCPF } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Loader2 } from "lucide-react";

// Função para formatar número do prontuário com 6 dígitos
const formatNumeroProntuario = (numero: number | null): string => {
  if (!numero) return "-";
  return String(numero).padStart(6, "0");
};

interface Paciente {
  id: string;
  numeroProntuario: number | null;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  dataNascimento: Date;
  ativo: boolean;
}

export function ProntuariosContent() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchPacientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });

      const response = await fetch(
        `/api/medico/pacientes?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar pacientes");
      }

      const data = await response.json();
      setPacientes(data.pacientes || []);
    } catch (error) {
      toast.error("Erro ao carregar pacientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const handleViewProntuario = (pacienteId: string) => {
    router.push(`/prontuario-paciente/${pacienteId}`);
  };

  // Filtrar dados localmente
  const filteredData = React.useMemo(() => {
    if (!globalFilter) return pacientes;
    const search = globalFilter.toLowerCase();
    return pacientes.filter((paciente) => {
      const nome = paciente.nome?.toLowerCase() || "";
      const cpf = paciente.cpf?.toLowerCase() || "";
      const numeroProntuario = formatNumeroProntuario(paciente.numeroProntuario).toLowerCase();
      return nome.includes(search) || cpf.includes(search) || numeroProntuario.includes(search);
    });
  }, [pacientes, globalFilter]);

  const getStatusBadge = (ativo: boolean) => {
    if (ativo) {
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Ativo
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Inativo
        </Badge>
      );
    }
  };

  const columns: ColumnDef<Paciente>[] = React.useMemo(
    () => [
      {
        accessorKey: "numeroProntuario",
        header: () => (
          <span className="text-xs font-semibold">
            Nº Prontuário
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">{formatNumeroProntuario(row.original.numeroProntuario)}</span>
        ),
      },
      {
        accessorKey: "nome",
        header: () => (
          <span className="text-xs font-semibold">
            Nome
          </span>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-xs">{row.original.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "cpf",
        header: () => (
          <span className="text-xs font-semibold">
            CPF
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs">{formatCPF(row.original.cpf)}</div>
        ),
      },
      {
        accessorKey: "dataNascimento",
        header: () => (
          <span className="text-xs font-semibold">
            Data de Nascimento
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs">{formatDate(row.original.dataNascimento)}</div>
        ),
      },
      {
        accessorKey: "contato",
        header: () => (
          <span className="text-xs font-semibold">
            Contato
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs">
            {row.original.celular || row.original.telefone || (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "ativo",
        header: () => (
          <span className="text-xs font-semibold">
            Status
          </span>
        ),
        cell: ({ row }) => (
          <div>
            {getStatusBadge(row.original.ativo)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="w-full text-right text-xs font-semibold">Ações</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewProntuario(row.original.id)}
              title="Ver Prontuário"
              className="h-7 text-xs w-7 p-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title="Prontuários"
        subtitle="Visualize o prontuário completo dos pacientes"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de prontuários</CardTitle>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              type="search"
              placeholder="Buscar por nome ou CPF..." 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-8 text-xs bg-background w-64" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando pacientes...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-auto">
              {/* Table */}
              <div className="overflow-x-auto px-6 pt-6">
                <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead
                                key={header.id}
                                colSpan={header.colSpan}
                                className="text-xs font-semibold py-3"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="text-xs py-3">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center text-xs text-muted-foreground"
                          >
                            Nenhum paciente encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 pb-6">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground font-normal">
                    Linhas por página
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger size="sm" className="w-16 h-8 text-xs border-border/50" id="rows-per-page">
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
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
                <div className="flex items-center gap-6">
                  <span className="text-xs text-muted-foreground">
                    Página {table.getState().pagination.pageIndex + 1} de{" "}
                    {table.getPageCount()}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="hidden h-7 w-7 p-0 lg:flex text-muted-foreground hover:text-foreground"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">Primeira página</span>
                      <IconChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      size="icon"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">Página anterior</span>
                      <IconChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      size="icon"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">Próxima página</span>
                      <IconChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="hidden h-7 w-7 p-0 lg:flex text-muted-foreground hover:text-foreground"
                      size="icon"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">Última página</span>
                      <IconChevronsRight className="h-3.5 w-3.5" />
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
