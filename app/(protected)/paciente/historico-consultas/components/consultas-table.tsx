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
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";

interface Consulta {
  id: string;
  dataHora: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  status: string;
  valorCobrado: number | string | null;
}

interface ConsultasTableProps {
  data: Consulta[];
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    AGENDADA: { label: "Agendada", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
    CONFIRMADA: { label: "Confirmada", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
    CANCELADA: { label: "Cancelada", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
    REALIZADA: { label: "Realizada", className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
    FALTA: { label: "Falta", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
    EM_ATENDIMENTO: { label: "Em Atendimento", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
    CONCLUIDA: { label: "Concluída", className: "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-400" },
  };

  const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400" };

  return (
    <span className={`text-[10px] py-0.5 px-1.5 leading-tight rounded ${statusInfo.className}`}>
      {statusInfo.label}
    </span>
  );
};

const formatCurrencyValue = (value: number | string | null) => {
  if (!value) return "-";
  return formatCurrency(Number(value));
};

export function ConsultasTable({ data: initialData }: ConsultasTableProps) {
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
    return data.filter((consulta) => {
      const medicoNome = consulta.medico?.usuario.nome?.toLowerCase() || "";
      const tipoConsulta = consulta.tipoConsulta?.nome?.toLowerCase() || "";
      return medicoNome.includes(search) || tipoConsulta.includes(search);
    });
  }, [data, globalFilter]);

  const columns: ColumnDef<Consulta>[] = React.useMemo(
    () => [
      {
        accessorKey: "dataHora",
        header: () => (
          <span className="text-xs font-semibold">Data</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDate(new Date(row.original.dataHora))}
          </span>
        ),
      },
      {
        accessorKey: "dataHora",
        id: "hora",
        header: () => (
          <span className="text-xs font-semibold">Hora</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {formatTime(new Date(row.original.dataHora))}
          </span>
        ),
      },
      {
        accessorKey: "medico.usuario.nome",
        header: () => (
          <span className="text-xs font-semibold">Médico</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.medico?.usuario.nome || "-"}
          </span>
        ),
      },
      {
        accessorKey: "tipoConsulta.nome",
        header: () => (
          <span className="text-xs font-semibold">Tipo</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.tipoConsulta?.nome || "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-xs font-semibold">Status</span>
        ),
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "valorCobrado",
        header: () => (
          <span className="text-xs font-semibold">Valor</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {formatCurrencyValue(row.original.valorCobrado)}
          </span>
        ),
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
      globalFilter,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label htmlFor="search" className="text-xs">Buscar</Label>
          <Input
            id="search"
            placeholder="Buscar por médico, tipo de consulta..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-md text-xs mt-1"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-semibold py-3">
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
                <TableRow key={row.id}>
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
                  className="h-24 text-center text-xs"
                >
                  Nenhuma consulta encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground flex-1">
          {table.getFilteredRowModel().rows.length} consulta(s) encontrada(s).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-xs font-medium">
              Linhas por página
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20 text-xs" id="rows-per-page">
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
          <div className="flex w-fit items-center justify-center text-xs font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex text-xs"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Primeira página</span>
              <IconChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              <IconChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Próxima página</span>
              <IconChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 lg:flex text-xs"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Última página</span>
              <IconChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
