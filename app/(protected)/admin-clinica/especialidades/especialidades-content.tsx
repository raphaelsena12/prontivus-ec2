"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Stethoscope, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EspecialidadesTable } from "./components/especialidades-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface EspecialidadesContentProps {
  clinicaId: string;
}

export function EspecialidadesContent({ clinicaId }: EspecialidadesContentProps) {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEspecialidades = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/especialidades`);
      if (!response.ok) throw new Error("Erro ao carregar especialidades");
      const data = await response.json();
      setEspecialidades(data.especialidades || []);
    } catch (error) {
      toast.error("Erro ao carregar especialidades");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEspecialidades();
  }, [fetchEspecialidades]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Stethoscope}
        title="Especialidades"
        subtitle="Catálogo global (gerenciado pelo Super Admin) — usado por todos os tenants"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Especialidades</CardTitle>
          </div>
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
