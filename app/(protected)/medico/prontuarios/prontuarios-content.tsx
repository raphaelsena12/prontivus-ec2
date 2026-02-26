"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Users, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate, formatCPF } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Loader2 } from "lucide-react";

interface Paciente {
  id: string;
  numeroProntuario: number | null;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  dataNascimento: Date;
  ativo: boolean;
}

export function ProntuariosContent() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPacientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/medico/pacientes?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar pacientes");
      }

      const data = await response.json();
      setPacientes(data.pacientes || []);
    } catch (error) {
      toast.error("Erro ao carregar pacientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const handleViewProntuario = (pacienteId: string) => {
    router.push(`/prontuario-paciente/${pacienteId}`);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Users}
        title="Pacientes"
        subtitle="Visualize o prontuário completo dos pacientes"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <CardTitle className="text-sm font-semibold">Lista de Pacientes</CardTitle>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              type="search"
              placeholder="Buscar por nome ou CPF..." 
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
                <p className="text-sm text-muted-foreground">Carregando pacientes...</p>
              </div>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-6">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold py-3">Nº Prontuário</TableHead>
                    <TableHead className="text-xs font-semibold py-3">Nome</TableHead>
                    <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                    <TableHead className="text-xs font-semibold py-3">Data de Nascimento</TableHead>
                    <TableHead className="text-xs font-semibold py-3">Contato</TableHead>
                    <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientes.map((paciente) => (
                    <TableRow key={paciente.id}>
                      <TableCell className="text-xs">
                        {paciente.numeroProntuario || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {paciente.nome}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCPF(paciente.cpf)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(paciente.dataNascimento)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {paciente.celular || paciente.telefone || "-"}
                      </TableCell>
                      <TableCell>
                        {paciente.ativo ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => handleViewProntuario(paciente.id)}
                        >
                          <FileText className="w-3 h-3" />
                          Ver Prontuário
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





