"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { InsumosTable } from "./components/insumos-table";
import { InsumoDeleteDialog } from "./components/insumo-delete-dialog";
import { InsumoDialog } from "./components/insumo-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Insumo {
  id: string;
  nome: string;
  descricao: string | null;
  unidade: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InsumosContentProps {
  clinicaId: string;
}

export function InsumosContent({ clinicaId }: InsumosContentProps) {
  const router = useRouter();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [insumoDialogOpen, setInsumoDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState<Insumo | null>(null);

  const fetchInsumos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/insumos?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar insumos");
      const data = await response.json();
      setInsumos(data.insumos || []);
    } catch (error) {
      toast.error("Erro ao carregar insumos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsumos();
  }, [fetchInsumos]);

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setInsumoDialogOpen(true);
  };

  const handleDeleteClick = (insumo: Insumo) => {
    setInsumoToDelete(insumo);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchInsumos();
    setInsumoDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingInsumo(null);
    setInsumoToDelete(null);
  };

  const handleCreate = () => {
    setEditingInsumo(null);
    setInsumoDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Package}
        title="Insumos"
        subtitle="Gerencie os insumos cadastrados na clínica"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Insumos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por nome, descrição, unidade..." 
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Insumo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando insumos...</p>
              </div>
            </div>
          ) : insumos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum insumo encontrado</p>
            </div>
          ) : (
            <InsumosTable 
            data={insumos} 
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onCreate={handleCreate}
          />
          )}
        </CardContent>
      </Card>

      <InsumoDialog
        open={insumoDialogOpen}
        onOpenChange={setInsumoDialogOpen}
        insumo={editingInsumo}
        onSuccess={handleSuccess}
      />

      <InsumoDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        insumo={insumoToDelete}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

