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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { StatusPagamento } from "@/lib/generated/prisma/enums";
import { formatCurrency, formatDate, formatCNPJ } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, Calendar, Check } from "lucide-react";

interface Pagamento {
  id: string;
  tenantId: string;
  clinicaNome: string;
  clinicaCnpj: string;
  valor: number;
  mesReferencia: Date;
  status: StatusPagamento;
  metodoPagamento: string | null;
  transacaoId: string | null;
  dataPagamento: Date | null;
  dataVencimento: Date;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  planoNome: string;
}

interface PagamentosTableProps {
  data: Pagamento[];
  onConfirmar: (pagamento: Pagamento) => void;
}

const getStatusBadge = (status: StatusPagamento, dataVencimento: Date) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  const vencido = vencimento < hoje;

  switch (status) {
    case StatusPagamento.PAGO:
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Pago
        </Badge>
      );
    case StatusPagamento.PENDENTE:
      return vencido ? (
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-[10px] py-0.5 px-1.5 leading-tight">
          <XCircle className="mr-1 h-3 w-3" />
          Atrasado
        </Badge>
      ) : (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] py-0.5 px-1.5 leading-tight">
          <Clock className="mr-1 h-3 w-3" />
          Pendente
        </Badge>
      );
    case StatusPagamento.CANCELADO:
      return (
        <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelado
        </Badge>
      );
    case StatusPagamento.REEMBOLSADO:
      return (
        <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
          <AlertCircle className="mr-1 h-3 w-3" />
          Reembolsado
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">{status}</Badge>;
  }
};

export function PagamentosTable({ data, onConfirmar }: PagamentosTableProps) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns: ColumnDef<Pagamento>[] = React.useMemo(
    () => [
      {
        accessorKey: "clinicaNome",
        header: "Clínica",
        cell: ({ row }) => (
          <div className="font-medium text-xs">{row.original.clinicaNome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "clinicaCnpj",
        header: "CNPJ",
        cell: ({ row }) => (
          <div className="text-xs">
            {formatCNPJ(row.original.clinicaCnpj)}
          </div>
        ),
      },
      {
        accessorKey: "mesReferencia",
        header: "Mês",
        cell: ({ row }) => (
          <div className="text-xs">
            {new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            }).format(new Date(row.original.mesReferencia))}
          </div>
        ),
      },
      {
        accessorKey: "dataVencimento",
        header: "Vencimento",
        cell: ({ row }) => {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const vencimento = new Date(row.original.dataVencimento);
          vencimento.setHours(0, 0, 0, 0);
          const vencido =
            row.original.status === StatusPagamento.PENDENTE &&
            vencimento < hoje;

          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span
                className={`text-xs ${vencido ? "text-destructive font-medium" : ""}`}
              >
                {formatDate(row.original.dataVencimento)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) =>
          getStatusBadge(row.original.status, row.original.dataVencimento),
      },
      {
        accessorKey: "metodoPagamento",
        header: "Método",
        cell: ({ row }) => (
          <div className="text-xs">{row.original.metodoPagamento || "-"}</div>
        ),
      },
      {
        accessorKey: "valor",
        header: "Valor",
        cell: ({ row }) => (
          <div className="font-medium text-xs">
            {formatCurrency(row.original.valor)}
          </div>
        ),
      },
      {
        accessorKey: "dataPagamento",
        header: "Pagamento",
        cell: ({ row }) => (
          <div className="text-xs">
            {row.original.dataPagamento
              ? formatDate(row.original.dataPagamento)
              : "-"}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right">Confirmar</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {row.original.status === StatusPagamento.PENDENTE && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfirmar(row.original)}
                    className="text-xs h-7"
                  >
                    <Check className="h-3 w-3 mr-1.5" />
                    Confirmar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Confirmar pagamento e renovar licença da clínica</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
    ],
    [onConfirmar]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
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
        <div className="overflow-hidden px-6 pt-6">
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
                    Nenhum pagamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-6 pb-6">
          <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
            {table.getFilteredRowModel().rows.length} pagamento(s) encontrado(s).
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
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Primeira página</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Página anterior</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Próxima página</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Última página</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
    </div>
  );
}





