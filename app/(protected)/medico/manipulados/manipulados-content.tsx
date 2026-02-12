"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FlaskConical, Filter, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ManipuladosTable } from "./components/manipulados-table";
import { ManipuladoDialog } from "./components/manipulado-dialog";
import { ManipuladoDeleteDialog } from "./components/manipulado-delete-dialog";

interface Manipulado {
  id: string;
  descricao: string;
  informacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface ManipuladosContentProps {
  clinicaId: string;
}

export function ManipuladosContent({ clinicaId }: ManipuladosContentProps) {
  const router = useRouter();
  const [manipulados, setManipulados] = useState<Manipulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // Dialogs
  const [manipuladoDialogOpen, setManipuladoDialogOpen] = useState(false);
  const [editingManipulado, setEditingManipulado] = useState<Manipulado | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingManipulado, setDeletingManipulado] = useState<Manipulado | null>(null);

  const fetchManipulados = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/medico/manipulados?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar manipulados");
      const data = await response.json();
      setManipulados(data.manipulados || []);
    } catch (error) {
      toast.error("Erro ao carregar manipulados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManipulados();
  }, [fetchManipulados]);

  const handleEdit = (manipulado: Manipulado) => {
    setEditingManipulado(manipulado);
    setManipuladoDialogOpen(true);
  };

  const handleDeleteClick = (manipulado: Manipulado) => {
    setDeletingManipulado(manipulado);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchManipulados();
    setManipuladoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingManipulado(null);
    setDeletingManipulado(null);
  };

  const handleCreate = () => {
    setEditingManipulado(null);
    setManipuladoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Manipulados</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie os medicamentos manipulados
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Manipulados</CardTitle>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por descrição ou informações..." 
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
          </div>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
            <Plus className="mr-1.5 h-3 w-3" />
            Novo Manipulado
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando manipulados...</p>
              </div>
            </div>
          ) : (
            <ManipuladosTable
              data={manipulados}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onCreate={handleCreate}
            />
          )}
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <ManipuladoDialog
        open={manipuladoDialogOpen}
        onOpenChange={setManipuladoDialogOpen}
        manipulado={editingManipulado}
        onSuccess={handleSuccess}
      />

      <ManipuladoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        manipulado={deletingManipulado}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
