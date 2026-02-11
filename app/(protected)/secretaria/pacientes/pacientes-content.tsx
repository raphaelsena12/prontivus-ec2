"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Edit, Users } from "lucide-react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate, formatCPF } from "@/lib/utils";

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  dataNascimento: Date;
  ativo: boolean;
}

const getStatusBadge = (ativo: boolean) => {
  if (ativo) {
    return (
      <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
        <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
        Ativo
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
        <IconLoader className="mr-1 h-3 w-3" />
        Inativo
      </Badge>
    );
  }
};

export function PacientesContent() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/secretaria/pacientes?${params.toString()}`
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
  };

  useEffect(() => {
    fetchPacientes();
  }, [search]);

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Campo de busca e botão */}
        <div className="flex items-center gap-2 px-4 lg:px-6 pt-2 pb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="text-xs" onClick={() => router.push("/secretaria/pacientes/novo")}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo Paciente
          </Button>
        </div>

        {/* Conteúdo com margens laterais */}
        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Nome</TableHead>
                  <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Email</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Data Nascimento</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <span className="text-xs text-muted-foreground">Carregando pacientes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground opacity-50" />
                        <span className="text-xs text-muted-foreground">Nenhum paciente encontrado</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pacientes.map((paciente) => (
                    <TableRow key={paciente.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-3 font-medium">
                        {paciente.nome}
                      </TableCell>
                      <TableCell className="text-xs py-3">{formatCPF(paciente.cpf)}</TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">
                        {paciente.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {paciente.celular || paciente.telefone || "-"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {formatDate(paciente.dataNascimento)}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {getStatusBadge(paciente.ativo)}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                              router.push(`/secretaria/pacientes/${paciente.id}`)
                            }
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                              router.push(`/secretaria/pacientes/editar/${paciente.id}`)
                            }
                          >
                            <Edit className="h-3 w-3 mr-1.5" />
                            Editar
                          </Button>
                        </div>
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




