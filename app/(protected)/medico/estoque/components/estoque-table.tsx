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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
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

interface Estoque {
  id: string;
  medicamento: {
    id: string;
    nome: string;
    principioAtivo: string | null;
  };
  quantidadeAtual: number;
  quantidadeMinima: number;
  quantidadeMaxima: number | null;
  unidade: string;
  localizacao: string | null;
  createdAt?: Date;
}

interface EstoqueTableProps {
  data: Estoque[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

const getStatusBadge = (quantidadeAtual: number, quantidadeMinima: number) => {
  if (quantidadeAtual <= quantidadeMinima) {
    return (
      <Badge 
        variant="outline" 
        className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight"
      >
        Estoque Baixo
      </Badge>
    );
  }
  if (quantidadeAtual <= quantidadeMinima * 1.5) {
    return (
      <Badge 
        variant="outline" 
        className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight"
      >
        Atenção
      </Badge>
    );
  }
  return (
    <Badge 
      variant="outline" 
      className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight"
    >
      Normal
    </Badge>
  );
};

export function EstoqueTable({ 
  data: initialData, 
  globalFilter: externalGlobalFilter = "",
  onGlobalFilterChange 
}: EstoqueTableProps) {
  const [data] = React.useState(() => initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState(externalGlobalFilter);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  // Sincronizar com o filtro externo
  React.useEffect(() => {
    setGlobalFilter(externalGlobalFilter);
  }, [externalGlobalFilter]);

  // Atualizar filtro externo quando mudar internamente
  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    if (onGlobalFilterChange) {
      onGlobalFilterChange(value);
    }
  };

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Filtrar dados localmente
  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter((estoque) => {
      const nome = estoque.medicamento.nome?.toLowerCase() || "";
      const principioAtivo = estoque.medicamento.principioAtivo?.toLowerCase() || "";
      return nome.includes(search) || principioAtivo.includes(search);
    });
  }, [data, globalFilter]);

  const columns: ColumnDef<Estoque>[] = React.useMemo(
    () => [
      {
        accessorKey: "medicamento.nome",
        header: () => (
          <span className="text-xs font-semibold">
            Medicamento
          </span>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-xs py-3">{row.original.medicamento.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "medicamento.principioAtivo",
        header: () => (
          <span className="text-xs font-semibold">
            Princípio Ativo
          </span>
        ),
        cell: ({ row }) => (
          <div className="max-w-md truncate text-xs py-3">
            {row.original.medicamento.principioAtivo || (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeAtual",
        header: () => (
          <span className="text-xs font-semibold">
            Quantidade Atual
          </span>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-xs py-3">
            {row.original.quantidadeAtual} {row.original.unidade}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeMinima",
        header: () => (
          <span className="text-xs font-semibold">
            Quantidade Mínima
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs py-3">
            {row.original.quantidadeMinima} {row.original.unidade}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeMaxima",
        header: () => (
          <span className="text-xs font-semibold">
            Quantidade Máxima
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs py-3">
            {row.original.quantidadeMaxima
              ? `${row.original.quantidadeMaxima} ${row.original.unidade}`
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-xs font-semibold">
            Status
          </span>
        ),
        cell: ({ row }) =>
          getStatusBadge(row.original.quantidadeAtual, row.original.quantidadeMinima),
      },
      {
        accessorKey: "localizacao",
        header: () => (
          <span className="text-xs font-semibold">
            Localização
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs py-3">{row.original.localizacao || "-"}</div>
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
    onGlobalFilterChange: handleGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4 overflow-auto">
      {/* Table */}
      <div className="overflow-hidden px-6 pt-6">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="text-xs font-semibold py-3 bg-slate-100 px-4"
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
                    <TableCell key={cell.id} className="px-4 py-3 text-xs">
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
                  Nenhum medicamento em estoque encontrado.
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
  );
}
