"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
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
import { cn } from "@/lib/utils";
export interface CodigoTussCatalogoRow {
  id: string;
  codigoTuss: string;
  descricao: string;
  tipoProcedimento: string;
  sipGrupo?: string | null;
  categoriaExame?: string | null;
  categoriaProntivus?: string | null;
  dataVigenciaInicio: Date | string;
  dataVigenciaFim: Date | string | null;
  ativo: boolean;
}

interface TussCatalogoReadonlyTableProps {
  data: CodigoTussCatalogoRow[];
  entityLabel: string;
  /** Paginação só no cliente (subconjunto já carregado do servidor) */
  mode?: "client" | "server";
  serverPageCount?: number;
  serverPageIndex?: number;
  serverPageSize?: number;
  onServerPageChange?: (pageIndex: number) => void;
}

export function TussCatalogoReadonlyTable({
  data,
  entityLabel,
  mode = "client",
  serverPageCount = 1,
  serverPageIndex = 0,
  serverPageSize = 100,
  onServerPageChange,
}: TussCatalogoReadonlyTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 50,
  });

  const columns = React.useMemo(
    (): ColumnDef<CodigoTussCatalogoRow>[] => [
      {
        accessorKey: "codigoTuss",
        header: "Código TUSS",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-medium text-[10px] py-0.5 px-1.5 leading-tight"
          >
            {row.original.codigoTuss}
          </Badge>
        ),
      },
      {
        accessorKey: "descricao",
        header: "Descrição",
        cell: ({ row }) => {
          const full = row.original.descricao?.trim() ?? "";
          return (
            <div
              className="block w-full min-w-0 max-w-full truncate font-medium text-xs"
              title={full}
            >
              {full || "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "sipGrupo",
        header: "Tipo",
        cell: ({ row }) =>
          row.original.sipGrupo ? (
            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
              {row.original.sipGrupo}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "categoriaProntivus",
        header: "Categoria",
        cell: ({ row }) =>
          row.original.categoriaProntivus ? (
            <Badge
              variant="outline"
              className="max-w-[min(14rem,36vw)] text-[10px] py-0.5 px-1.5 leading-tight font-normal"
              title={row.original.categoriaProntivus}
            >
              <span className="block truncate">
                {row.original.categoriaProntivus}
              </span>
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "ativo",
        header: "Status",
        cell: ({ row }) =>
          row.original.ativo ? (
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
          ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination:
        mode === "server"
          ? {
              pageIndex: serverPageIndex,
              pageSize: serverPageSize,
            }
          : pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: mode === "server" ? undefined : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(mode === "client"
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    manualPagination: mode === "server",
    pageCount: mode === "server" ? serverPageCount : undefined,
  });

  const rowCount =
    mode === "server"
      ? data.length
      : table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-4 overflow-auto">
      <div className="overflow-hidden px-6 pt-6">
        <Table className="table-fixed">
          <TableHeader className="bg-slate-100 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      "text-xs font-semibold py-3",
                      header.column.id === "descricao" &&
                        "min-w-0 max-w-[min(28rem,42vw)]",
                      header.column.id === "sipGrupo" && "pr-1",
                      header.column.id === "categoriaProntivus" && "pl-1"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "text-xs py-3 align-top",
                        cell.column.id === "descricao" &&
                          "min-w-0 max-w-[min(28rem,42vw)] whitespace-nowrap",
                        cell.column.id === "sipGrupo" && "pr-1",
                        cell.column.id === "categoriaProntivus" && "pl-1"
                      )}
                    >
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
                  Nenhum {entityLabel} encontrado no catálogo TUSS global.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {rowCount} {entityLabel} (catálogo global, somente leitura).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          {mode === "client" && (
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
                <SelectTrigger
                  size="sm"
                  className="w-20 h-7 text-xs"
                  id="rows-per-page"
                >
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
          )}
          <div className="flex w-fit items-center justify-center text-xs font-medium">
            Página{" "}
            {mode === "server"
              ? serverPageIndex + 1
              : table.getState().pagination.pageIndex + 1}{" "}
            de{" "}
            {mode === "server"
              ? serverPageCount
              : table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex text-xs"
              onClick={() =>
                mode === "server"
                  ? onServerPageChange?.(0)
                  : table.setPageIndex(0)
              }
              disabled={
                mode === "server"
                  ? serverPageIndex <= 0
                  : !table.getCanPreviousPage()
              }
            >
              <span className="sr-only">Primeira página</span>
              <IconChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() =>
                mode === "server"
                  ? onServerPageChange?.(serverPageIndex - 1)
                  : table.previousPage()
              }
              disabled={
                mode === "server"
                  ? serverPageIndex <= 0
                  : !table.getCanPreviousPage()
              }
            >
              <span className="sr-only">Página anterior</span>
              <IconChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() =>
                mode === "server"
                  ? onServerPageChange?.(serverPageIndex + 1)
                  : table.nextPage()
              }
              disabled={
                mode === "server"
                  ? serverPageIndex >= serverPageCount - 1
                  : !table.getCanNextPage()
              }
            >
              <span className="sr-only">Próxima página</span>
              <IconChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 lg:flex text-xs"
              size="icon"
              onClick={() =>
                mode === "server"
                  ? onServerPageChange?.(serverPageCount - 1)
                  : table.setPageIndex(table.getPageCount() - 1)
              }
              disabled={
                mode === "server"
                  ? serverPageIndex >= serverPageCount - 1
                  : !table.getCanNextPage()
              }
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
