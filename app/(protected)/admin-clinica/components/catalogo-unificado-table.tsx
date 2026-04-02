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

export type OrigemCatalogo = "TUSS" | "CLINICA" | "GLOBAL";

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
  variant: "exames" | "procedimentos" | "medicamentos";
  /** Mantém linhas com origem Clínica antes das TUSS ao ordenar colunas (ex.: Descrição). */
  prioritizeClinicaSort?: boolean;
  serverPageCount: number;
  serverPageIndex: number;
  serverPageSize: number;
  onServerPageChange: (pageIndex: number) => void;
  onEditClinica?: (row: LinhaCatalogoUnificado) => void;
  onDeleteClinica?: (row: LinhaCatalogoUnificado) => void;
}

function compareOrigemClinicaPrimeiro(
  a: LinhaCatalogoUnificado,
  b: LinhaCatalogoUnificado
): number {
  const pa = a.origem === "CLINICA" ? 0 : 1;
  const pb = b.origem === "CLINICA" ? 0 : 1;
  return pa - pb;
}

export function CatalogoUnificadoTable({
  data,
  entityLabel,
  variant,
  prioritizeClinicaSort = false,
  serverPageCount,
  serverPageIndex,
  serverPageSize,
  onServerPageChange,
  onEditClinica,
  onDeleteClinica,
}: CatalogoUnificadoTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    prioritizeClinicaSort ? [{ id: "descricao", desc: false }] : []
  );

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
        ...(prioritizeClinicaSort
          ? {
              sortingFn: (rowA, rowB) => {
                const o = compareOrigemClinicaPrimeiro(
                  rowA.original,
                  rowB.original
                );
                if (o !== 0) return o;
                return rowA.original.descricao.localeCompare(
                  rowB.original.descricao,
                  "pt-BR",
                  { sensitivity: "base" }
                );
              },
            }
          : {}),
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
            <div className="min-w-0 w-full max-w-[min(18rem,34vw)]">
              <Badge
                variant="outline"
                title={row.original.tipo}
                className="max-w-full min-w-0 w-full shrink text-[10px] py-0.5 px-1.5 leading-tight font-normal"
              >
                <span className="block min-w-0 truncate">
                  {row.original.tipo}
                </span>
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "categoria",
        header: "Categoria",
        cell: ({ row }) =>
          row.original.categoria ? (
            <div className="min-w-0 w-full max-w-[min(14rem,30vw)]">
              <Badge
                variant="outline"
                title={row.original.categoria}
                className="max-w-full min-w-0 w-full shrink text-[10px] py-0.5 px-1.5 leading-tight font-normal"
              >
                <span className="block min-w-0 truncate">
                  {row.original.categoria}
                </span>
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "origem",
        header: "Origem",
        cell: ({ row }) => {
          const origem = row.original.origem;
          if (origem === "TUSS") {
            return (
              <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5 leading-tight">
                TUSS
              </Badge>
            );
          }
          if (origem === "GLOBAL") {
            return (
              <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5 leading-tight">
                Global
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
              Clínica
            </Badge>
          );
        },
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
        ...(prioritizeClinicaSort
          ? {
              sortingFn: (rowA, rowB) => {
                const o = compareOrigemClinicaPrimeiro(
                  rowA.original,
                  rowB.original
                );
                if (o !== 0) return o;
                if (rowA.original.ativo === rowB.original.ativo) return 0;
                return rowA.original.ativo ? -1 : 1;
              },
            }
          : {}),
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
          // Rows com origem CLINICA sempre permitem edição/exclusão
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
  }, [variant, prioritizeClinicaSort, onEditClinica, onDeleteClinica]);

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
                      header.column.id === "tipo" &&
                        "min-w-0 w-[15%] max-w-[min(18rem,34vw)] pr-2 whitespace-normal",
                      header.column.id === "categoria" &&
                        "min-w-0 w-[13%] max-w-[min(14rem,30vw)] pl-1 whitespace-normal"
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
                        cell.column.id === "tipo" &&
                          "min-w-0 w-[15%] max-w-[min(18rem,34vw)] pr-2 whitespace-normal align-top",
                        cell.column.id === "categoria" &&
                          "min-w-0 w-[13%] max-w-[min(14rem,30vw)] pl-1 whitespace-normal align-top"
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
