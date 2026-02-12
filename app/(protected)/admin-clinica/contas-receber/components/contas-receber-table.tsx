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
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface ContaReceber {
  id: string;
  descricao: string;
  paciente: {
    id: string;
    nome: string;
  } | null;
  valor: number;
  dataVencimento: Date;
  dataRecebimento: Date | null;
  status: "PENDENTE" | "RECEBIDO" | "VENCIDO" | "CANCELADO";
  observacoes: string | null;
  createdAt?: Date;
}

interface ContasReceberTableProps {
  data: ContaReceber[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  onDelete?: (conta: ContaReceber) => void;
}

const formatDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "RECEBIDO":
      return (
        <Badge 
          variant="outline" 
          className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight"
        >
          Recebido
        </Badge>
      );
    case "VENCIDO":
      return (
        <Badge 
          variant="outline" 
          className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight"
        >
          Vencido
        </Badge>
      );
    case "CANCELADO":
      return (
        <Badge 
          variant="outline" 
          className="bg-transparent border-gray-500 text-gray-700 dark:text-gray-400 text-[10px] py-0.5 px-1.5 leading-tight"
        >
          Cancelado
        </Badge>
      );
    default:
      return (
        <Badge 
          variant="outline" 
          className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight"
        >
          Pendente
        </Badge>
      );
  }
};

export function ContasReceberTable({
  data: initialData,
  statusFilter,
  onStatusFilterChange,
  globalFilter,
  onGlobalFilterChange,
  onDelete,
}: ContasReceberTableProps) {
  const router = useRouter();
  const [data] = React.useState(() => initialData);
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

  // Filtrar dados localmente por status e busca
  const filteredData = React.useMemo(() => {
    let filtered = data;
    if (statusFilter !== "all") {
      filtered = filtered.filter((conta) => conta.status === statusFilter);
    }
    if (globalFilter) {
      const search = globalFilter.toLowerCase();
      filtered = filtered.filter((conta) => {
        const descricao = conta.descricao?.toLowerCase() || "";
        const paciente = conta.paciente?.nome?.toLowerCase() || "";
        return descricao.includes(search) || paciente.includes(search);
      });
    }
    return filtered;
  }, [data, statusFilter, globalFilter]);

  const columns: ColumnDef<ContaReceber>[] = React.useMemo(
    () => [
      {
        accessorKey: "descricao",
        header: "Descrição",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.descricao}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "paciente.nome",
        header: "Paciente",
        cell: ({ row }) => (
          <div>{row.original.paciente?.nome || "-"}</div>
        ),
      },
      {
        accessorKey: "valor",
        header: "Valor",
        cell: ({ row }) => (
          <div className="font-medium">
            {formatCurrency(row.original.valor)}
          </div>
        ),
      },
      {
        accessorKey: "dataVencimento",
        header: "Vencimento",
        cell: ({ row }) => formatDate(row.original.dataVencimento),
      },
      {
        accessorKey: "dataRecebimento",
        header: "Recebimento",
        cell: ({ row }) => formatDate(row.original.dataRecebimento),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right text-xs font-semibold">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/admin-clinica/contas-receber/editar/${row.original.id}`
                )
              }
              title="Editar conta a receber"
              className="h-7 w-7 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(row.original)}
                title="Excluir conta a receber"
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
    [router, onDelete]
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
      <div className="overflow-hidden px-6 pt-6">
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
                    Nenhuma conta a receber encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} conta(s) a receber encontrada(s).
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

