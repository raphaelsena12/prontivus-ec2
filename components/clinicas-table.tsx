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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { StatusClinica, TipoPlano } from "@/lib/generated/prisma/enums";
import { Edit, Power, Users } from "lucide-react";

interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string | null;
  status: StatusClinica;
  tokensMensaisDisponiveis: number;
  tokensConsumidos: number;
  telemedicineHabilitada: boolean;
  dataContratacao: Date;
  dataExpiracao: Date | null;
  plano: {
    id: string;
    nome: TipoPlano;
    tokensMensais: number;
    preco: number;
    telemedicineHabilitada: boolean;
  };
}

interface ClinicasTableProps {
  data: Clinica[];
  onEdit: (clinica: Clinica) => void;
  onToggleStatus: (clinica: Clinica) => void;
  onManageUsers?: (clinica: Clinica) => void;
}

const formatCNPJ = (cnpj: string) => {
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
};

const formatDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

const getPlanoBadgeVariant = (plano: TipoPlano) => {
  switch (plano) {
    case TipoPlano.PROFISSIONAL:
      return "default";
    case TipoPlano.INTERMEDIARIO:
      return "secondary";
    case TipoPlano.BASICO:
      return "outline";
    default:
      return "outline";
  }
};

const getStatusBadge = (status: StatusClinica) => {
  switch (status) {
    case StatusClinica.ATIVA:
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Ativa
        </Badge>
      );
    case StatusClinica.INATIVA:
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Inativa
        </Badge>
      );
    case StatusClinica.SUSPENSA:
      return (
        <Badge variant="destructive" className="text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Suspensa
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
          {status}
        </Badge>
      );
  }
};

const getPlanoLabel = (plano: TipoPlano) => {
  switch (plano) {
    case TipoPlano.BASICO:
      return "Básico";
    case TipoPlano.INTERMEDIARIO:
      return "Intermediário";
    case TipoPlano.PROFISSIONAL:
      return "Profissional";
    default:
      return plano;
  }
};

export function ClinicasTable({
  data: initialData,
  onEdit,
  onToggleStatus,
  onManageUsers,
}: ClinicasTableProps) {
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

  const columns: ColumnDef<Clinica>[] = React.useMemo(
    () => [
      {
        accessorKey: "nome",
        header: "Nome",
        cell: ({ row }) => (
          <div className="font-medium text-xs">{row.original.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "cnpj",
        header: "CNPJ",
        cell: ({ row }) => formatCNPJ(row.original.cnpj),
      },
      {
        accessorKey: "plano.nome",
        header: "Plano",
        cell: ({ row }) => (
          <Badge variant={getPlanoBadgeVariant(row.original.plano.nome)} className="text-[10px] py-0.5 px-1.5 leading-tight">
            {getPlanoLabel(row.original.plano.nome)}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "tokensConsumidos",
        header: () => <div className="w-full text-right">Tokens</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs">
            {row.original.tokensConsumidos.toLocaleString("pt-BR")} /{" "}
            {row.original.tokensMensaisDisponiveis.toLocaleString("pt-BR")}
          </div>
        ),
      },
      {
        accessorKey: "dataContratacao",
        header: "Contratação",
        cell: ({ row }) => formatDate(row.original.dataContratacao),
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {onManageUsers && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageUsers(row.original)}
                    className="text-xs h-7"
                  >
                    <Users className="h-3 w-3 mr-1.5" />
                    Usuários
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerenciar usuários da clínica</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(row.original)}
                  className="text-xs h-7"
                >
                  <Edit className="h-3 w-3 mr-1.5" />
                  Editar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar informações da clínica</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStatus(row.original)}
                  className="text-xs h-7"
                >
                  <Power className="h-3 w-3 mr-1.5" />
                  {row.original.status === StatusClinica.ATIVA
                    ? "Desativar"
                    : "Ativar"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {row.original.status === StatusClinica.ATIVA
                    ? "Desativar clínica"
                    : "Ativar clínica"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        ),
        enableHiding: false,
      },
    ],
    [onEdit, onToggleStatus, onManageUsers]
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
                  Nenhuma clínica encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} clínica(s) encontrada(s).
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

