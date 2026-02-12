"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Filter, Search } from "lucide-react";
import { ProntuariosTable } from "./prontuarios-table";

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
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Prontuários</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Visualize e gerencie os prontuários dos pacientes
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Prontuários</CardTitle>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              type="search"
              placeholder="Buscar por paciente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-background w-64" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando prontuários...</p>
              </div>
            </div>
          ) : (
            <ProntuariosTable data={prontuarios} search={search} onSearchChange={setSearch} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}





