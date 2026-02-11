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
import { Edit, Trash2, Package, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

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
  onEdit?: (estoque: Estoque) => void;
  onDelete?: (estoque: Estoque) => void;
  newButtonUrl?: string;
  onMovimentacoes?: () => void;
  onUpload?: () => void;
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
  onEdit,
  onDelete,
  newButtonUrl,
  onMovimentacoes,
  onUpload,
}: EstoqueTableProps) {
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
        header: "Medicamento",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.medicamento.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "medicamento.principioAtivo",
        header: "Princípio Ativo",
        cell: ({ row }) => (
          <div className="max-w-md truncate">
            {row.original.medicamento.principioAtivo || (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeAtual",
        header: "Quantidade Atual",
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.quantidadeAtual} {row.original.unidade}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeMinima",
        header: "Quantidade Mínima",
        cell: ({ row }) => (
          <div>
            {row.original.quantidadeMinima} {row.original.unidade}
          </div>
        ),
      },
      {
        accessorKey: "quantidadeMaxima",
        header: "Quantidade Máxima",
        cell: ({ row }) => (
          <div>
            {row.original.quantidadeMaxima
              ? `${row.original.quantidadeMaxima} ${row.original.unidade}`
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) =>
          getStatusBadge(row.original.quantidadeAtual, row.original.quantidadeMinima),
      },
      {
        accessorKey: "localizacao",
        header: "Localização",
        cell: ({ row }) => (
          <div>{row.original.localizacao || "-"}</div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right text-xs font-semibold">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {onEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(row.original)}
                title="Editar estoque"
                className="h-7 w-7 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/admin-clinica/estoque/editar/${row.original.id}`)
                }
                title="Editar estoque"
                className="h-7 w-7 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(row.original)}
                title="Excluir estoque"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        enableHiding: false,
      },
    ],
    [router, onEdit, onDelete]
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
    <div className="flex flex-col">
      <div className="flex items-center justify-end px-4 lg:px-6 pt-2 pb-4 gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
          <Input 
            type="search"
            placeholder="Buscar por nome ou princípio ativo..." 
            value={globalFilter} 
            onChange={(e) => setGlobalFilter(e.target.value)} 
            className="pl-9 h-8 text-xs bg-background" 
          />
        </div>
        {onUpload && (
          <Button onClick={onUpload} variant="outline" className="text-xs">
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload em Massa
          </Button>
        )}
        {onMovimentacoes && (
          <Button variant="outline" onClick={onMovimentacoes} className="text-xs">
            <Package className="mr-2 h-3.5 w-3.5" />
            Movimentações
          </Button>
        )}
        {!onMovimentacoes && (
          <Button variant="outline" onClick={() => router.push("/admin-clinica/estoque/movimentacoes")} className="text-xs">
            <Package className="mr-2 h-3.5 w-3.5" />
            Movimentações
          </Button>
        )}
        {newButtonUrl && (
          <Button onClick={() => router.push(newButtonUrl)} className="text-xs">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo Estoque
          </Button>
        )}
      </div>
      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className="text-xs font-semibold py-3">
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
                    className="h-24 text-center text-xs"
                  >
                    Nenhum medicamento em estoque encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 lg:px-6 pt-4">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} item(ns) encontrado(s).
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
              <SelectTrigger size="sm" className="w-20 h-7 text-xs" id="rows-per-page">
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

