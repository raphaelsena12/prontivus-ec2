"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Medicamento {
  id: string;
  nome: string;
  principioAtivo: string | null;
  laboratorio: string | null;
  apresentacao: string | null;
  concentracao: string | null;
  unidade: string | null;
  ativo: boolean;
}

export function MedicamentosContent() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMedicamentos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/secretaria/medicamentos?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar medicamentos");
      }

      const data = await response.json();
      setMedicamentos(data.medicamentos || []);
    } catch (error) {
      toast.error("Erro ao carregar medicamentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicamentos();
  }, [search]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Medicamentos</h1>
          <p className="text-muted-foreground">
            Visualize os medicamentos disponíveis na clínica
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, princípio ativo ou laboratório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Princípio Ativo</TableHead>
                  <TableHead>Laboratório</TableHead>
                  <TableHead>Apresentação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : medicamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum medicamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  medicamentos.map((medicamento) => (
                    <TableRow key={medicamento.id}>
                      <TableCell className="font-medium">
                        {medicamento.nome}
                      </TableCell>
                      <TableCell>
                        {medicamento.principioAtivo || "-"}
                      </TableCell>
                      <TableCell>
                        {medicamento.laboratorio || "-"}
                      </TableCell>
                      <TableCell>
                        {medicamento.apresentacao || "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            medicamento.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {medicamento.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

