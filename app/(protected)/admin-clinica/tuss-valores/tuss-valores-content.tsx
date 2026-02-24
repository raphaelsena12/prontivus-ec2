"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Filter, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { TussValoresTable } from "./components/tuss-valores-table";
import { TussValorDeleteDialog } from "./components/tuss-valor-delete-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TussValor {
  id: string;
  codigoTuss: {
    id: string;
    codigoTuss: string;
    descricao: string;
  };
  operadora: {
    id: string;
    razaoSocial: string;
  } | null;
  planoSaude: {
    id: string;
    nome: string;
  } | null;
  tipoConsulta: {
    id: string;
    nome: string;
  } | null;
  valor: number;
  dataVigenciaInicio: Date;
  dataVigenciaFim: Date | null;
  ativo: boolean;
  observacoes: string | null;
}

interface TussValoresContentProps {
  clinicaId: string;
}

export function TussValoresContent({ clinicaId }: TussValoresContentProps) {
  const router = useRouter();
  const [valores, setValores] = useState<TussValor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [valorToDelete, setValorToDelete] = useState<TussValor | null>(null);

  const fetchValores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/tuss-valores`);
      if (!response.ok) throw new Error("Erro ao carregar valores TUSS");
      const data = await response.json();
      setValores(data.valores);
    } catch (error) {
      toast.error("Erro ao carregar valores TUSS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValores();
  }, [fetchValores]);

  const handleDeleteClick = (valor: TussValor) => {
    setValorToDelete(valor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchValores();
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={DollarSign}
        title="Valores TUSS"
        subtitle="Gerencie os valores TUSS por operadora e plano de saúde"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Valores TUSS</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando valores TUSS...</p>
              </div>
            </div>
          ) : valores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum valor TUSS encontrado</p>
            </div>
          ) : (
            <TussValoresTable 
            data={valores} 
            onDelete={handleDeleteClick}
            newButtonUrl="/admin-clinica/tuss-valores/novo"
          />
          )}
        </CardContent>
      </Card>

      <TussValorDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        valor={valorToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
