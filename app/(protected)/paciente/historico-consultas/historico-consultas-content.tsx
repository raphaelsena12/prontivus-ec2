"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ConsultasTable } from "./components/consultas-table";

interface Consulta {
  id: string;
  dataHora: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  status: string;
  valorCobrado: number | string | null;
}

export function HistoricoConsultasContent() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsultas();
  }, []);

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/paciente/consultas`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`;
        console.error("Erro ao carregar consultas:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setConsultas(data.consultas || []);
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar consultas";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Conteúdo com margens laterais */}
        <div className="px-4 lg:px-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : consultas.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-xs text-muted-foreground">
                  Nenhuma consulta encontrada
                </p>
              </CardContent>
            </Card>
          ) : (
            <ConsultasTable data={consultas} />
          )}
        </div>
      </div>
    </div>
  );
}
