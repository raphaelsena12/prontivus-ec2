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
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

interface Prescricao {
  id: string;
  dataPrescricao: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  consulta: {
    id: string;
    dataHora: Date;
  } | null;
  medicamentos: Array<{
    id: string;
    medicamento: {
      nome: string;
    };
    dosagem: string | null;
    posologia: string | null;
  }>;
}

interface PrescricoesTableProps {
  data: Prescricao[];
}

export function PrescricoesTable({ data: initialData }: PrescricoesTableProps) {
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
  const [selectedPrescricao, setSelectedPrescricao] =
    React.useState<Prescricao | null>(null);

  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter((prescricao) => {
      const medicoNome = prescricao.medico?.usuario.nome?.toLowerCase() || "";
      const medicamentos = prescricao.medicamentos
        .map((m) => m.medicamento.nome?.toLowerCase() || "")
        .join(" ");
      return medicoNome.includes(search) || medicamentos.includes(search);
    });
  }, [data, globalFilter]);

  const columns: ColumnDef<Prescricao>[] = React.useMemo(
    () => [
      {
        accessorKey: "dataPrescricao",
        header: () => (
          <span className="text-xs font-semibold">Data</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDate(new Date(row.original.dataPrescricao))}
          </span>
        ),
      },
      {
        accessorKey: "medico.usuario.nome",
        header: () => (
          <span className="text-xs font-semibold">Médico</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.medico?.usuario.nome || "-"}
          </span>
        ),
      },
      {
        accessorKey: "medicamentos",
        header: () => (
          <span className="text-xs font-semibold">Medicamentos</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.medicamentos.length > 0
              ? `${row.original.medicamentos.length} medicamento(s)`
              : "-"}
          </span>
        ),
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
                className="text-xs h-7"
                onClick={() => setSelectedPrescricao(row.original)}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                Ver Detalhes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes da Prescrição</DialogTitle>
                <DialogDescription>
                  Informações completas da prescrição médica
                </DialogDescription>
              </DialogHeader>
              {selectedPrescricao && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        Data da Prescrição
                      </h3>
                      <p className="text-base">
                        {formatDate(new Date(selectedPrescricao.dataPrescricao))}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        Médico
                      </h3>
                      <p className="text-base">
                        {selectedPrescricao.medico?.usuario.nome || "-"}
                      </p>
                    </div>
                  </div>

                  {selectedPrescricao.consulta && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        Consulta
                      </h3>
                      <p className="text-base">
                        {formatDate(new Date(selectedPrescricao.consulta.dataHora))}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      Medicamentos
                    </h3>
                    {selectedPrescricao.medicamentos.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPrescricao.medicamentos.map((med, index) => (
                          <div
                            key={med.id}
                            className="border rounded-lg p-3 space-y-1"
                          >
                            <p className="font-medium text-base">
                              {index + 1}. {med.medicamento.nome}
                            </p>
                            {med.dosagem && (
                              <p className="text-sm text-muted-foreground">
                                Dosagem: {med.dosagem}
                              </p>
                            )}
                            {med.posologia && (
                              <p className="text-sm text-muted-foreground">
                                Posologia: {med.posologia}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base">Nenhum medicamento prescrito</p>
                    )}
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
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      globalFilter,
    },
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label htmlFor="search" className="text-xs">Buscar</Label>
          <Input
            id="search"
            placeholder="Buscar por médico, medicamento..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-md text-xs mt-1"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-semibold py-3">
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
                <TableRow key={row.id}>
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
                  Nenhuma prescrição encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground flex-1">
          {table.getFilteredRowModel().rows.length} prescrição(ões) encontrada(s).
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
