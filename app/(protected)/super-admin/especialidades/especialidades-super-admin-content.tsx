"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

import { EspecialidadesTable } from "@/app/(protected)/admin-clinica/especialidades/components/especialidades-table";
import { EspecialidadeDialog } from "@/app/(protected)/admin-clinica/especialidades/components/especialidade-dialog";
import { EspecialidadeDeleteDialog } from "@/app/(protected)/admin-clinica/especialidades/components/especialidade-delete-dialog";

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
}

const API_BASE = "/api/super-admin/especialidades";

export function EspecialidadesSuperAdminContent() {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Especialidade | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Especialidade | null>(null);

  const fetchEspecialidades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}?limit=5000`);
      if (!res.ok) throw new Error("Erro ao carregar especialidades");
      const data = await res.json();
      setEspecialidades(data.especialidades || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar especialidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEspecialidades();
  }, [fetchEspecialidades]);

  const handleSuccess = () => {
    fetchEspecialidades();
    setDialogOpen(false);
    setDeleteOpen(false);
    setEditing(null);
    setToDelete(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Stethoscope}
        title="Especialidades (Global)"
        subtitle="Gerencie o catálogo global de especialidades (usado por todos os tenants)"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <CardTitle className="text-sm font-semibold">Lista de Especialidades</CardTitle>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Nova Especialidade
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando especialidades...</p>
              </div>
            </div>
          ) : especialidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhuma especialidade encontrada</p>
            </div>
          ) : (
            <EspecialidadesTable
              data={especialidades}
              onEdit={(esp) => {
                setEditing(esp);
                setDialogOpen(true);
              }}
              onDelete={(esp) => {
                setToDelete(esp);
                setDeleteOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <EspecialidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        especialidade={editing}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <EspecialidadeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        especialidade={toDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />
    </div>
  );
}

