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
  IconCircleCheckFilled,
  IconLoader,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Exame {
  id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
}

interface GrupoExameItem {
  id: string;
  ordem: number;
  exame: Exame;
}

interface GrupoExame {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  exames: GrupoExameItem[];
}

interface GruposExamesTableProps {
  data: GrupoExame[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  onEdit: (grupoExame: GrupoExame) => void;
  onDelete: (grupoExame: GrupoExame) => void;
  newButtonUrl?: string;
  onCreate?: () => void;
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export function GruposExamesTable({
  data: initialData,
  globalFilter: externalGlobalFilter = "",
  onGlobalFilterChange,
  onEdit,
  onDelete,
  newButtonUrl,
  onCreate,
}: GruposExamesTableProps) {
  const router = useRouter();
  const [data] = React.useState(() => initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState(externalGlobalFilter);
  
  // Sincronizar com filtro externo
  React.useEffect(() => {
    setGlobalFilter(externalGlobalFilter);
  }, [externalGlobalFilter]);
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
    return data.filter((grupoExame) => {
      const nome = grupoExame.nome?.toLowerCase() || "";
      const descricao = grupoExame.descricao?.toLowerCase() || "";
      return nome.includes(search) || descricao.includes(search);
    });
  }, [data, globalFilter]);

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

  const columns: ColumnDef<GrupoExame>[] = React.useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: () => (
          <span className="text-xs font-semibold">
            Data
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.createdAt)}</span>
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
        accessorKey: "descricao",
        header: () => (
          <span className="text-xs font-semibold">
            Descrição
          </span>
        ),
        cell: ({ row }) => (
          <div className="max-w-md truncate text-xs">
            {row.original.descricao || (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "exames",
        header: () => (
          <span className="text-xs font-semibold">
            Exames
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-xs">
            <Badge variant="outline" className="text-[10px]">
              {row.original.exames.length} {row.original.exames.length === 1 ? "exame" : "exames"}
            </Badge>
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
              onClick={() => onEdit(row.original)}
              title="Editar grupo de exames"
              className="h-7 text-xs w-7 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(row.original)}
              title="Excluir grupo de exames"
              className="h-7 text-xs w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    [onEdit, onDelete]
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
    <div className="flex flex-col gap-4 overflow-auto">
      {/* Table */}
      <div className="overflow-x-auto px-6 pt-6">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                  Nenhum grupo de exames encontrado.
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
