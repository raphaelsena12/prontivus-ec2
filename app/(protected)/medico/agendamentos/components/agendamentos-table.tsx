"use client";

import * as React from "react";
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
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, Clock, ArrowRight } from "lucide-react";
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
import { formatDate, formatTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Agendamento {
  id: string;
  dataHora: Date;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
  };
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  operadora: {
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
  planoSaude: {
    nome: string;
  } | null;
  valorCobrado: number | string | null;
  status: string;
}

interface AgendamentosTableProps {
  data: Agendamento[];
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  AGENDADO: {
    label: "Agendado",
    className: "bg-neutral-100 text-neutral-600 border border-neutral-200",
    dot: "bg-neutral-400",
  },
  CONFIRMADO: {
    label: "Confirmado",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  EM_ATENDIMENTO: {
    label: "Em Atendimento",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  CONCLUIDO: {
    label: "Concluído",
    className: "bg-slate-50 text-slate-500 border border-slate-200",
    dot: "bg-slate-400",
  },
  REALIZADA: {
    label: "Realizada",
    className: "bg-slate-50 text-slate-500 border border-slate-200",
    dot: "bg-slate-400",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "bg-red-50 text-red-600 border border-red-200",
    dot: "bg-red-400",
  },
};

const getStatusBadge = (status: string) => {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-neutral-100 text-neutral-600 border border-neutral-200",
    dot: "bg-neutral-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export function AgendamentosTable({
  data: initialData,
}: AgendamentosTableProps) {
  const router = useRouter();
  const [data] = React.useState(() => initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter((agendamento) => {
      const nome = agendamento.paciente.nome?.toLowerCase() || "";
      const cpf = agendamento.paciente.cpf?.toLowerCase() || "";
      const telefone = agendamento.paciente.telefone?.toLowerCase() || "";
      const celular = agendamento.paciente.celular?.toLowerCase() || "";
      return nome.includes(search) || cpf.includes(search) || telefone.includes(search) || celular.includes(search);
    });
  }, [data, globalFilter]);

  const handleIniciarAtendimento = (agendamentoId: string) => {
    router.push(`/medico/atendimento?consultaId=${agendamentoId}`);
  };

  const columns: ColumnDef<Agendamento>[] = React.useMemo(
    () => [
      {
        accessorKey: "dataHora",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Data
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-foreground">{formatDate(row.original.dataHora)}</span>
          </div>
        ),
      },
      {
        accessorKey: "dataHora",
        id: "hora",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Hora
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-foreground font-medium">{formatTime(row.original.dataHora)}</span>
          </div>
        ),
      },
      {
        accessorKey: "paciente.nome",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Paciente
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{row.original.paciente.nome}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.paciente.telefone || row.original.paciente.celular || "-"}
            </span>
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "codigoTuss",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Código TUSS
          </span>
        ),
        cell: ({ row }) => (
          row.original.codigoTuss ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-mono text-foreground">{row.original.codigoTuss.codigoTuss}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {row.original.codigoTuss.descricao}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        ),
      },
      {
        accessorKey: "operadora",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Convênio
          </span>
        ),
        cell: ({ row }) => (
          row.original.operadora ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {row.original.operadora.nomeFantasia || row.original.operadora.razaoSocial}
              </span>
              {row.original.planoSaude && (
                <span className="text-xs text-muted-foreground">
                  {row.original.planoSaude.nome}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Particular</span>
          )
        ),
      },
      {
        accessorKey: "valorCobrado",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Valor
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.valorCobrado
              ? `R$ ${Number(row.original.valorCobrado).toFixed(2)}`
              : "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Status
          </span>
        ),
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right block">
            Ações
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            {(row.original.status === "AGENDADO" || row.original.status === "CONFIRMADO") ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleIniciarAtendimento(row.original.id)}
                className="h-8 text-xs font-medium text-neutral-600 hover:text-foreground hover:bg-neutral-100 gap-1.5"
              >
                Iniciar Atendimento
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground/50">-</span>
            )}
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
    <div className="flex flex-col gap-0">
      {/* Search bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 z-10 pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por paciente, CPF ou telefone..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 w-[400px] h-9 text-sm bg-neutral-50/50 border-border/50 focus:bg-white placeholder:text-muted-foreground/50"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} resultado{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="h-10 bg-slate-100 px-4"
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
                  className="border-b border-border/30 hover:bg-neutral-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
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
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum agendamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40">
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
  );
}
