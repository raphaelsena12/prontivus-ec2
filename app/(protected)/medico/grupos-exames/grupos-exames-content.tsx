"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ClipboardList, Filter, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { GruposExamesTable } from "./components/grupos-exames-table";
import { GrupoExameDialog } from "./components/grupo-exame-dialog";
import { GrupoExameDeleteDialog } from "./components/grupo-exame-delete-dialog";
import { PageHeader } from "@/components/page-header";

interface Exame {
  id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
}

interface GrupoExameItem {
  id: string;
  ordem: number;
  exame: Exame;
}

interface GrupoExame {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  exames: GrupoExameItem[];
}

interface GruposExamesContentProps {
  clinicaId: string;
}

export function GruposExamesContent({ clinicaId }: GruposExamesContentProps) {
  const router = useRouter();
  const [gruposExames, setGruposExames] = useState<GrupoExame[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // Dialogs
  const [grupoExameDialogOpen, setGrupoExameDialogOpen] = useState(false);
  const [editingGrupoExame, setEditingGrupoExame] = useState<GrupoExame | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGrupoExame, setDeletingGrupoExame] = useState<GrupoExame | null>(null);

  const fetchGruposExames = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/medico/grupos-exames?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar grupos de exames");
      const data = await response.json();
      setGruposExames(data.gruposExames || []);
    } catch (error) {
      toast.error("Erro ao carregar grupos de exames");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGruposExames();
  }, [fetchGruposExames]);

  const handleEdit = (grupoExame: GrupoExame) => {
    setEditingGrupoExame(grupoExame);
    setGrupoExameDialogOpen(true);
  };

  const handleDeleteClick = (grupoExame: GrupoExame) => {
    setDeletingGrupoExame(grupoExame);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchGruposExames();
    setGrupoExameDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingGrupoExame(null);
    setDeletingGrupoExame(null);
  };

  const handleCreate = () => {
    setEditingGrupoExame(null);
    setGrupoExameDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={ClipboardList}
        title="Grupos de Exames"
        subtitle="Gerencie os grupos de exames pré-cadastrados"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Grupos de Exames</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por nome ou descrição..." 
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Grupo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando grupos de exames...</p>
              </div>
            </div>
          ) : (
            <GruposExamesTable
              data={gruposExames}
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
      <GrupoExameDialog
        open={grupoExameDialogOpen}
        onOpenChange={setGrupoExameDialogOpen}
        grupoExame={editingGrupoExame}
        onSuccess={handleSuccess}
      />

      <GrupoExameDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        grupoExame={deletingGrupoExame}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
