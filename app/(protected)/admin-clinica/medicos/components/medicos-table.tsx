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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
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
import { Edit, Trash2, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

interface Medico {
  id: string;
  crm: string;
  especialidade: string;
  ativo?: boolean;
  createdAt: Date;
  usuario: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
}

interface MedicosTableProps {
  data: Medico[];
  onEdit?: (medico: Medico) => void;
  onDelete?: (medico: Medico) => void;
  onCreate?: () => void;
  onUpload?: () => void;
}

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "-";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dateObj);
  } catch (error) {
    return "-";
  }
};

export function MedicosTable({
  data: initialData,
  onEdit,
  onDelete,
  onCreate,
  onUpload,
}: MedicosTableProps) {
  const router = useRouter();
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

  // Filtrar dados localmente
  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter((med) => {
      const nome = med.usuario.nome?.toLowerCase() || "";
      const crm = med.crm?.toLowerCase() || "";
      const especialidade = med.especialidade?.toLowerCase() || "";
      const email = med.usuario.email?.toLowerCase() || "";
      return nome.includes(search) || crm.includes(search) || especialidade.includes(search) || email.includes(search);
    });
  }, [data, globalFilter]);

  const columns: ColumnDef<Medico>[] = React.useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Data",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "usuario.nome",
        header: "Nome",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.usuario.nome}</div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "crm",
        header: "CRM",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
            {row.original.crm}
          </Badge>
        ),
      },
      {
        accessorKey: "especialidade",
        header: "Especialidade",
        cell: ({ row }) => <div>{row.original.especialidade || "-"}</div>,
      },
      {
        accessorKey: "usuario.email",
        header: "Email",
        cell: ({ row }) => (
          <div className="max-w-md truncate">
            {row.original.usuario.email || (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "usuario.telefone",
        header: "Telefone",
        cell: ({ row }) => <div>{row.original.usuario.telefone || "-"}</div>,
      },
      {
        accessorKey: "ativo",
        header: "Status",
        cell: ({ row }) => {
          const ativo = row.original.ativo !== false; // Default true se não especificado
          return ativo ? (
            <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
              <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
              <IconLoader className="mr-1 h-3 w-3" />
              Inativo
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="w-full text-right text-xs font-semibold">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit ? onEdit(row.original) : undefined}
              title="Editar médico"
              className="h-7 w-7 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(row.original)}
                title="Excluir médico"
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
                    Nenhum médico encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-6 pb-6">
        <div className="text-muted-foreground hidden flex-1 text-xs lg:flex">
          {table.getFilteredRowModel().rows.length} médico(s) encontrado(s).
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

