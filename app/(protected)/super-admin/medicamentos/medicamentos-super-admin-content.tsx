"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Loader2, Pill, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

import { MedicamentosTable } from "@/app/(protected)/admin-clinica/medicamentos/components/medicamentos-table";
import { MedicamentoDialog } from "@/app/(protected)/admin-clinica/medicamentos/components/medicamento-dialog";
import { MedicamentoDeleteDialog } from "@/app/(protected)/admin-clinica/medicamentos/components/medicamento-delete-dialog";
import { AnvisaSyncDialog } from "@/app/(protected)/admin-clinica/medicamentos/components/anvisa-sync-dialog";

interface Medicamento {
  id: string;
  nome: string;
  principioAtivo: string | null;
  laboratorio: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  controle: string | null;
  unidade: string | null;
  pharmaceuticalForm?: string | null;
  therapeuticClass?: string | null;
  prescriptionType?: string | null;
  controlType?: string | null;
  pregnancyRisk?: boolean;
  pediatricUse?: boolean;
  hepaticAlert?: boolean;
  renalAlert?: boolean;
  highRisk?: boolean;
  status?: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const API_BASE = "/api/super-admin/medicamentos";

export function MedicamentosSuperAdminContent() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medicamento | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Medicamento | null>(null);

  const [anvisaSyncDialogOpen, setAnvisaSyncDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar medicamentos");
      const data = await res.json();
      setMedicamentos(data.medicamentos || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar medicamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicamentos();
  }, [fetchMedicamentos]);

  const handleSuccess = () => {
    fetchMedicamentos();
    setDialogOpen(false);
    setDeleteOpen(false);
    setEditing(null);
    setToDelete(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Pill}
        title="Medicamentos (Global)"
        subtitle="Gerencie o catálogo global de medicamentos (usado por todos os tenants)"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <CardTitle className="text-sm font-semibold">Lista de Medicamentos</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar por nome comercial, princípio ativo..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-8 text-xs bg-background w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setAnvisaSyncDialogOpen(true)}
              className="h-8 text-xs px-3 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Database className="mr-1.5 h-3 w-3" />
              Integração Anvisa
            </Button>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(true)}
              className="h-8 w-8 p-0"
              title="Upload em Massa"
              aria-label="Upload em Massa"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Medicamento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando medicamentos...</p>
              </div>
            </div>
          ) : medicamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum medicamento encontrado</p>
            </div>
          ) : (
            <MedicamentosTable
              data={medicamentos}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onEdit={(m) => {
                setEditing(m);
                setDialogOpen(true);
              }}
              onDelete={(m) => {
                setToDelete(m);
                setDeleteOpen(true);
              }}
              onCreate={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <MedicamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        medicamento={editing}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <MedicamentoDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        medicamento={toDelete}
        onSuccess={handleSuccess}
        apiBasePath={API_BASE}
      />

      <AnvisaSyncDialog
        open={anvisaSyncDialogOpen}
        onOpenChange={setAnvisaSyncDialogOpen}
        onSuccess={handleSuccess}
        apiPath="/api/anvisa/sync"
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/super-admin/upload/medicamentos"
        title="Upload de Medicamentos em Massa"
        description='Faça upload de um arquivo Excel (.xlsx) com as colunas: "active_ingredient", "commercial_name", "pharmaceutical_form", "concentration", "presentation", "unit", "therapeutic_class", "prescription_type", "control_type", "pregnancy_risk", "pediatric_use", "hepatic_alert", "renal_alert", "high_risk", "status".'
        onSuccess={handleSuccess}
      />
    </div>
  );
}

