"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ProntuariosTable } from "./prontuarios-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Prontuario {
  id: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    dataNascimento: Date | null;
  };
  medico: {
    usuario: {
      nome: string;
    };
  };
  consulta: {
    id: string;
    dataHora: Date;
  } | null;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  evolucao: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function ProntuariosContent() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProntuarios();
  }, [search]);

  const loadProntuarios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(
        `/api/medico/prontuarios?${params.toString()}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`;
        console.error("Erro ao carregar prontuários:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setProntuarios(data.prontuarios || []);
    } catch (error) {
      console.error("Erro ao carregar prontuários:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar prontuários";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">Histórico de Prontuários</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie o histórico de prontuários médicos
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <div className="mb-4">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Buscar por paciente, CPF ou diagnóstico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : prontuarios.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  Nenhum prontuário encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <ProntuariosTable data={prontuarios} />
          )}
        </div>
      </div>
    </div>
  );
}





