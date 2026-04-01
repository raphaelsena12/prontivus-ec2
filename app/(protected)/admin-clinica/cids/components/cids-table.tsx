"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Search } from "lucide-react";

interface Cid {
  id: string;
  codigo: string;
  descricao: string;
  grupoNome?: string | null;
  categoriaCod?: string | null;
  categoriaNome?: string | null;
  subcategoriaCod?: string | null;
  subcategoriaNome?: string | null;
  categoria: string | null;
  subcategoria: string | null;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface CidsTableProps {
  data: Cid[];
  onEdit: (cid: Cid) => void;
  onDelete: (cid: Cid) => void;
}

export function CidsTable({ data, onEdit, onDelete }: CidsTableProps) {
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return data;
    const s = search.toLowerCase();
    return data.filter((item) =>
      item.codigo.toLowerCase().includes(s) ||
      item.descricao.toLowerCase().includes(s) ||
      (item.grupoNome || "").toLowerCase().includes(s) ||
      (item.categoriaCod || "").toLowerCase().includes(s) ||
      (item.categoriaNome || "").toLowerCase().includes(s) ||
      (item.subcategoriaCod || "").toLowerCase().includes(s) ||
      (item.subcategoriaNome || "").toLowerCase().includes(s) ||
      (item.categoria || "").toLowerCase().includes(s) ||
      (item.subcategoria || "").toLowerCase().includes(s)
    );
  }, [data, search]);

  const columns = React.useMemo<ColumnDef<Cid>[]>(
    () => [
      {
        id: "categoria_cod",
        header: "categoria_cod",
        cell: ({ row }) => <Badge variant="outline">{row.original.categoriaCod || "-"}</Badge>,
      },
      {
        id: "categoria_nome",
        header: "categoria_nome",
        cell: ({ row }) => row.original.categoriaNome || "-",
      },
      {
        id: "subcategoria_cod",
        header: "subcategoria_cod",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.subcategoriaCod || row.original.codigo}</Badge>
        ),
      },
      {
        id: "subcategoria_nome",
        header: "subcategoria_nome",
        cell: ({ row }) => row.original.subcategoriaNome || row.original.descricao,
      },
      {
        id: "grupo_nome",
        header: "grupo_nome",
        cell: ({ row }) => row.original.grupoNome || "-",
      },
      {
        accessorKey: "ativo",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline" className={row.original.ativo ? "text-green-700 border-green-500" : "text-red-700 border-red-500"}>
            {row.original.ativo ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acoes</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(row.original)}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por grupo/categoria/subcategoria..."
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader className="bg-slate-100">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-semibold">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center h-24 text-xs">
                Nenhum CID encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} CID(s) encontrado(s)</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs">
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
