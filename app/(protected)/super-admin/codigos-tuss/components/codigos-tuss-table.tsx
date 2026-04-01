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
import { Edit, Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
  descricaoDetalhada: string | null;
  tipoProcedimento: string;
  categoriaExame: string | null;
  sipGrupo?: string | null;
  categoriaProntivus?: string | null;
  categoriaSadt?: string | null;
  usaGuiaSadt?: boolean;
  subgrupoTuss?: string | null;
  grupoTuss?: string | null;
  capituloTuss?: string | null;
  fonteAnsTabela22?: string | null;
  dataVigenciaInicio: Date | string;
  dataVigenciaFim: Date | string | null;
  ativo: boolean;
  createdAt?: Date | string;
}

interface CodigosTussTableProps {
  data: CodigoTuss[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  onDelete?: (codigoTuss: CodigoTuss) => void;
}

export function CodigosTussTableSuperAdmin({
  data: initialData,
  globalFilter: externalGlobalFilter,
  onGlobalFilterChange,
  onDelete,
}: CodigosTussTableProps) {
  const router = useRouter();
  const [data] = React.useState(() => initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 50,
  });

  const globalFilter = externalGlobalFilter ?? internalGlobalFilter;
  const setGlobalFilter = onGlobalFilterChange ?? setInternalGlobalFilter;

  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter((codigo) => {
      const codigoTuss = codigo.codigoTuss?.toLowerCase() || "";
      const descricao = codigo.descricao?.toLowerCase() || "";
      return codigoTuss.includes(search) || descricao.includes(search);
    });
  }, [data, globalFilter]);

  const columns: ColumnDef<CodigoTuss>[] = React.useMemo(
    () => [
      {
        accessorKey: "codigoTuss",
        header: "Código",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-medium text-[10px] py-0.5 px-1.5 leading-tight"
          >
            {row.original.codigoTuss}
          </Badge>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "descricao",
        header: "Descrição TUSS",
        cell: ({ row }) => (
          <div className="max-w-md truncate font-medium">{row.original.descricao}</div>
        ),
      },
      {
        accessorKey: "sipGrupo",
        header: "SIP Grupo",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.sipGrupo?.toString() || "—"}</span>
        ),
      },
      {
        accessorKey: "categoriaProntivus",
        header: "Categoria Prontivus",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.categoriaProntivus || "—"}</div>
        ),
      },
      {
        accessorKey: "categoriaSadt",
        header: "Categoria SADT",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.categoriaSadt || "—"}</div>
        ),
      },
      {
        accessorKey: "usaGuiaSadt",
        header: "Usa guia SADT",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
            {row.original.usaGuiaSadt ? "SIM" : "NÃO"}
          </Badge>
        ),
      },
      {
        accessorKey: "subgrupoTuss",
        header: "Subgrupo TUSS",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.subgrupoTuss || "—"}</div>
        ),
      },
      {
        accessorKey: "grupoTuss",
        header: "Grupo TUSS",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.grupoTuss || "—"}</div>
        ),
      },
      {
        accessorKey: "capituloTuss",
        header: "Capítulo TUSS",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.capituloTuss || "—"}</div>
        ),
      },
      {
        accessorKey: "fonteAnsTabela22",
        header: "Fonte ANS Tabela 22",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.original.fonteAnsTabela22 || "—"}</div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right text-xs font-semibold">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/super-admin/codigos-tuss/editar/${row.original.id}`)}
              title="Editar código TUSS"
              className="h-7 px-2 text-xs"
            >
              <Edit className="mr-1 h-4 w-4" />
              Editar
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(row.original)}
                title="Excluir código TUSS"
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
    [onDelete, router]
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
    } as any,
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
    <div className="flex flex-col gap-4 overflow-auto">
      <div className="overflow-hidden px-6">
        <Table>
          <TableHeader className="bg-slate-100 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="text-xs font-semibold py-3"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs">
                  Nenhum código TUSS encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} registro(s) encontrado(s).
        </div>

        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-xs font-medium">
              Linhas por página
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20 h-7 text-xs" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
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
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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

