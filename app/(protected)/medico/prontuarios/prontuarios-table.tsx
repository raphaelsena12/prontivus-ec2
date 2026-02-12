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
import { formatCPF } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface Prontuario {
  id: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    dataNascimento: Date | null;
  };
  medico: {
    usuario: {
      nome: string;
    };
  };
  consulta: {
    id: string;
    dataHora: Date;
  } | null;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  evolucao: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProntuariosTableProps {
  data: Prontuario[];
  search?: string;
  onSearchChange?: (value: string) => void;
}

const formatDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const formatDateOnly = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export function ProntuariosTable({
  data: initialData,
  search = "",
  onSearchChange,
}: ProntuariosTableProps) {
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
  const [selectedProntuario, setSelectedProntuario] =
    React.useState<Prontuario | null>(null);

  const columns: ColumnDef<Prontuario>[] = React.useMemo(
    () => [
      {
        accessorKey: "paciente.nome",
        header: () => <span className="text-xs font-semibold">Paciente</span>,
        cell: ({ row }) => (
          <div className="text-xs font-medium">{row.original.paciente.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "paciente.cpf",
        header: () => <span className="text-xs font-semibold">CPF</span>,
        cell: ({ row }) => <span className="text-xs">{formatCPF(row.original.paciente.cpf)}</span>,
      },
      {
        accessorKey: "medico.usuario.nome",
        header: () => <span className="text-xs font-semibold">Médico</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.medico.usuario.nome}</span>,
      },
      {
        accessorKey: "consulta.dataHora",
        header: () => <span className="text-xs font-semibold">Data da Consulta</span>,
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.consulta?.dataHora || null)}</span>,
      },
      {
        accessorKey: "diagnostico",
        header: () => <span className="text-xs font-semibold">Diagnóstico</span>,
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate text-xs">
            {row.original.diagnostico || "-"}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: () => <span className="text-xs font-semibold">Data de Criação</span>,
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right text-xs font-semibold">Ações</div>,
        cell: ({ row }) => (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProntuario(row.original)}
                className="text-xs h-7"
              >
                <Eye className="h-3 w-3 mr-1.5" />
                Ver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Detalhes do Prontuário</DialogTitle>
                <DialogDescription className="text-xs">
                  Informações completas do prontuário médico
                </DialogDescription>
              </DialogHeader>
              {selectedProntuario && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-xs text-muted-foreground">
                        Paciente
                      </h3>
                      <p className="text-xs mt-1">{selectedProntuario.paciente.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        CPF: {formatCPF(selectedProntuario.paciente.cpf)}
                      </p>
                      {selectedProntuario.paciente.dataNascimento && (
                        <p className="text-xs text-muted-foreground">
                          Nascimento:{" "}
                          {formatDateOnly(selectedProntuario.paciente.dataNascimento)}
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-muted-foreground">
                        Médico
                      </h3>
                      <p className="text-xs mt-1">
                        {selectedProntuario.medico.usuario.nome}
                      </p>
                    </div>
                  </div>

                  {selectedProntuario.consulta && (
                    <div>
                      <h3 className="font-semibold text-xs text-muted-foreground">
                        Consulta
                      </h3>
                      <p className="text-xs mt-1">
                        {formatDate(selectedProntuario.consulta.dataHora)}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-xs text-muted-foreground mb-1">
                      Anamnese
                    </h3>
                    <p className="text-xs whitespace-pre-wrap">
                      {selectedProntuario.anamnese || "-"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-muted-foreground mb-1">
                      Exame Físico
                    </h3>
                    <p className="text-xs whitespace-pre-wrap">
                      {selectedProntuario.exameFisico || "-"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-muted-foreground mb-1">
                      Diagnóstico
                    </h3>
                    <p className="text-xs whitespace-pre-wrap">
                      {selectedProntuario.diagnostico || "-"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-muted-foreground mb-1">
                      Conduta
                    </h3>
                    <p className="text-xs whitespace-pre-wrap">
                      {selectedProntuario.conduta || "-"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-muted-foreground mb-1">
                      Evolução
                    </h3>
                    <p className="text-xs whitespace-pre-wrap">
                      {selectedProntuario.evolucao || "-"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <h3 className="font-semibold text-xs text-muted-foreground">
                        Criado em
                      </h3>
                      <p className="text-xs">
                        {formatDate(selectedProntuario.createdAt)}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-muted-foreground">
                        Atualizado em
                      </h3>
                      <p className="text-xs">
                        {formatDate(selectedProntuario.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    []
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
      <div className="overflow-hidden">
        <div className="px-6 pt-6">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
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
                    Nenhum prontuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} prontuário(s) encontrado(s).
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
              <SelectTrigger size="sm" className="w-20 text-xs" id="rows-per-page">
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
              <IconChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              <IconChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 text-xs"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Próxima página</span>
              <IconChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 lg:flex text-xs"
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





