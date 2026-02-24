"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Building2, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useRouter } from "next/navigation";
import { StatusClinica, TipoPlano } from "@/lib/generated/prisma/enums";
import { ClinicaDialog } from "./clinica-dialog";
import { toggleClinicaStatus } from "./actions";
import { ClinicasTable } from "@/components/clinicas-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  logoUrl?: string | null;
  plano: {
    id: string;
    nome: TipoPlano;
    tokensMensais: number;
    preco: number;
    telemedicineHabilitada: boolean;
  };
}

interface Plano {
  id: string;
  nome: TipoPlano;
  tokensMensais: number;
  preco: number;
  telemedicineHabilitada: boolean;
}

interface ClinicasContentProps {
  clinicas: Clinica[];
  planos: Plano[];
}

export function ClinicasContent({
  clinicas: initialClinicas,
  planos,
}: ClinicasContentProps) {
  const router = useRouter();
  const [clinicas, setClinicas] = useState(initialClinicas);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [clinicaToToggle, setClinicaToToggle] = useState<Clinica | null>(null);


  const handleCreate = () => {
    setEditingClinica(null);
    setDialogOpen(true);
  };

  const handleEdit = (clinica: Clinica) => {
    setEditingClinica(clinica);
    setDialogOpen(true);
  };

  const handleToggleStatus = (clinica: Clinica) => {
    setClinicaToToggle(clinica);
    setConfirmDialogOpen(true);
  };

  const handleManageUsers = (clinica: Clinica) => {
    router.push(`/super-admin/clinicas/${clinica.id}/usuarios`);
  };

  const confirmToggleStatus = async () => {
    if (!clinicaToToggle) return;

    const result = await toggleClinicaStatus(clinicaToToggle.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `Clínica ${result.novoStatus === StatusClinica.ATIVA ? "ativada" : "desativada"} com sucesso`
      );
      // Atualizar estado local
      setClinicas((prev) =>
        prev.map((c) =>
          c.id === clinicaToToggle.id ? { ...c, status: result.novoStatus! } : c
        )
      );
    }

    setConfirmDialogOpen(false);
    setClinicaToToggle(null);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingClinica(null);
    // Recarregar página para atualizar dados
    window.location.reload();
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Building2}
        title="Clínicas"
        subtitle="Gerencie as clínicas cadastradas no sistema"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Clínicas</CardTitle>
          </div>
          <Button 
            onClick={handleCreate} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 text-xs px-3"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Nova Clínica
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ClinicasTable
            data={clinicas}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onManageUsers={handleManageUsers}
          />
        </CardContent>
      </Card>

      <ClinicaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        clinica={editingClinica}
        planos={planos}
      />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração</DialogTitle>
            <DialogDescription>
              {clinicaToToggle && (
                <>
                  Deseja{" "}
                  {clinicaToToggle.status === StatusClinica.ATIVA
                    ? "desativar"
                    : "ativar"}{" "}
                  a clínica <strong>{clinicaToToggle.nome}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setClinicaToToggle(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmToggleStatus}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
