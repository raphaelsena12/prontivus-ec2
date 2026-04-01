"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
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
import { Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

export type OrigemCatalogo = "TUSS" | "CLINICA";

export interface LinhaCatalogoUnificado {
  rowId: string;
  origem: OrigemCatalogo;
  sourceId: string;
  codigo: string;
  descricao: string;
  tipo: string | null;
  categoria: string | null;
  valor?: string | null;
  ativo: boolean;
}

interface CatalogoUnificadoTableProps {
  data: LinhaCatalogoUnificado[];
  entityLabel: string;
  variant: "exames" | "procedimentos";
  serverPageCount: number;
  serverPageIndex: number;
  serverPageSize: number;
  onServerPageChange: (pageIndex: number) => void;
  onEditClinica?: (row: LinhaCatalogoUnificado) => void;
  onDeleteClinica?: (row: LinhaCatalogoUnificado) => void;
}

export function CatalogoUnificadoTable({
  data,
  entityLabel,
  variant,
  serverPageCount,
  serverPageIndex,
  serverPageSize,
  onServerPageChange,
  onEditClinica,
  onDeleteClinica,
}: CatalogoUnificadoTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo((): ColumnDef<LinhaCatalogoUnificado>[] => {
    const base: ColumnDef<LinhaCatalogoUnificado>[] = [
      {
        id: "codigo",
        header: "Código TUSS",
        cell: ({ row }) => {
          const c = row.original.codigo;
          if (!c || c === "—") {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Badge
              variant="outline"
              className="font-medium text-[10px] py-0.5 px-1.5 leading-tight"
            >
              {c}
            </Badge>
          );
        },
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
        id: "tipo",
        header: "Tipo",
        cell: ({ row }) =>
          row.original.tipo ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0.5 px-1.5 leading-tight"
            >
              {row.original.tipo}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "categoria",
        header: "Categoria",
        cell: ({ row }) =>
          row.original.categoria ? (
            <Badge
              variant="outline"
              className="max-w-[min(14rem,36vw)] text-[10px] py-0.5 px-1.5 leading-tight font-normal"
              title={row.original.categoria}
            >
              <span className="block truncate">{row.original.categoria}</span>
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "origem",
        header: "Origem",
        cell: ({ row }) => (
          <Badge
            variant={row.original.origem === "TUSS" ? "secondary" : "outline"}
            className="text-[10px] py-0.5 px-1.5 leading-tight"
          >
            {row.original.origem === "TUSS" ? "TUSS" : "Clínica"}
          </Badge>
        ),
      },
    ];

    if (variant === "procedimentos") {
      base.push({
        id: "valor",
        header: "Valor",
        cell: ({ row }) => {
          if (row.original.origem === "TUSS" || row.original.valor == null) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          const v =
            typeof row.original.valor === "string"
              ? parseFloat(row.original.valor)
              : Number(row.original.valor);
          return (
            <span className="text-xs font-medium">{formatCurrency(v)}</span>
          );
        },
      });
    }

    base.push(
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
      {
        id: "actions",
        header: () => (
          <div className="w-full text-right text-xs font-semibold">Ações</div>
        ),
        cell: ({ row }) => {
          if (row.original.origem !== "CLINICA") {
            return (
              <span className="text-[10px] text-muted-foreground block text-right">
                —
              </span>
            );
          }
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onEditClinica?.(row.original)}
              >
                <Edit className="mr-1 h-3 w-3" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onDeleteClinica?.(row.original)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        },
      }
    );

    return base;
  }, [variant, onEditClinica, onDeleteClinica]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: serverPageIndex,
        pageSize: serverPageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: serverPageCount,
    getRowId: (row) => row.rowId,
  });

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
                      header.column.id === "tipo" && "pr-1",
                      header.column.id === "categoria" && "pl-1"
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
                        cell.column.id === "tipo" && "pr-1",
                        cell.column.id === "categoria" && "pl-1"
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
                  Nenhum {entityLabel} encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {data.length} {entityLabel} nesta página (TUSS + clínica).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="flex w-fit items-center justify-center text-xs font-medium">
            Página {serverPageIndex + 1} de {serverPageCount}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex text-xs"
              onClick={() => onServerPageChange(0)}
              disabled={serverPageIndex <= 0}
            >
              <IconChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => onServerPageChange(serverPageIndex - 1)}
              disabled={serverPageIndex <= 0}
            >
              <IconChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => onServerPageChange(serverPageIndex + 1)}
              disabled={serverPageIndex >= serverPageCount - 1}
            >
              <IconChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 lg:flex text-xs"
              size="icon"
              onClick={() => onServerPageChange(serverPageCount - 1)}
              disabled={serverPageIndex >= serverPageCount - 1}
            >
              <IconChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
