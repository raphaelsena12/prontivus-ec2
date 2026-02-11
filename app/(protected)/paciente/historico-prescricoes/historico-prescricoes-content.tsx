"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PrescricoesTable } from "./components/prescricoes-table";

interface Prescricao {
  id: string;
  dataPrescricao: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  consulta: {
    id: string;
    dataHora: Date;
  } | null;
  medicamentos: Array<{
    id: string;
    medicamento: {
      nome: string;
    };
    dosagem: string | null;
    posologia: string | null;
  }>;
}

export function HistoricoPrescricoesContent() {
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescricoes();
  }, []);

  const loadPrescricoes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/paciente/prescricoes`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`;
        console.error("Erro ao carregar prescrições:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setPrescricoes(data.prescricoes || []);
    } catch (error) {
      console.error("Erro ao carregar prescrições:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar prescrições";
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
          ) : prescricoes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-xs text-muted-foreground">
                  Nenhuma prescrição encontrada
                </p>
              </CardContent>
            </Card>
          ) : (
            <PrescricoesTable data={prescricoes} />
          )}
        </div>
      </div>
    </div>
  );
}
