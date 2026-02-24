"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Upload, UserCircle, Filter, Ban, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PacienteDeleteDialog } from "./components/paciente-delete-dialog";
import { PacienteDialog } from "./components/paciente-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Paciente {
  id: string;
  numeroProntuario: number | null;
  nome: string;
  cpf: string | null;
  rg: string | null;
  dataNascimento: Date | string | null;
  sexo: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  profissao: string | null;
  estadoCivil: string | null;
  observacoes: string | null;
  ativo: boolean;
  createdAt?: Date;
}

interface PacientesContentProps {
  clinicaId: string;
}

export function PacientesContent({ clinicaId }: PacientesContentProps) {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ativo");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pacienteDialogOpen, setPacienteDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);
  const [pacienteToToggle, setPacienteToToggle] = useState<Paciente | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchPacientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
        ...(search && { search }),
      });
      const response = await fetch(`/api/admin-clinica/pacientes?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar pacientes");
      const data = await response.json();
      setPacientes(data.pacientes);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error("Erro ao carregar pacientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleEdit = async (paciente: Paciente) => {
    try {
      const response = await fetch(`/api/admin-clinica/pacientes/${paciente.id}`);
      if (!response.ok) throw new Error("Erro ao carregar paciente");
      const data = await response.json();
      setEditingPaciente(data.paciente);
      setPacienteDialogOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do paciente");
      console.error(error);
    }
  };

  const handleToggleStatusClick = (paciente: Paciente) => {
    setPacienteToToggle(paciente);
    setToggleStatusDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchPacientes();
    setPacienteDialogOpen(false);
    setToggleStatusDialogOpen(false);
    setEditingPaciente(null);
    setPacienteToToggle(null);
  };

  const handleCreate = () => {
    setEditingPaciente(null);
    setPacienteDialogOpen(true);
  };

  const colSpan = statusFilter !== "ativo" ? 8 : 7;

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={UserCircle}
        title="Pacientes"
        subtitle="Gerencie os pacientes cadastrados na clínica"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Pacientes</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-7 text-xs bg-background w-64"
              />
            </div>
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Paciente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden px-6 pt-6">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Nº Prontuário</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Nome</TableHead>
                  <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Email</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Data de Nascimento</TableHead>
                  {statusFilter !== "ativo" && (
                    <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                  )}
                  <TableHead className="text-right text-xs font-semibold py-3">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center text-xs py-3">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : pacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center text-xs py-3">
                      Nenhum paciente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pacientes.map((paciente) => (
                    <TableRow key={paciente.id}>
                      <TableCell className="font-semibold text-xs py-3 text-primary">
                        {paciente.numeroProntuario || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-xs py-3">{paciente.nome}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.cpf || "-"}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.email || "-"}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.telefone || "-"}</TableCell>
                      <TableCell className="text-xs py-3">
                        {formatDate(
                          paciente.dataNascimento
                            ? typeof paciente.dataNascimento === "string"
                              ? new Date(paciente.dataNascimento)
                              : paciente.dataNascimento
                            : null
                        )}
                      </TableCell>
                      {statusFilter !== "ativo" && (
                        <TableCell className="text-xs py-3">
                          {paciente.ativo ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(paciente)}
                            title="Editar paciente"
                            className="h-7 w-7"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {paciente.ativo ? (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleStatusClick(paciente)}
                              title="Desativar paciente"
                              className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:border-amber-300"
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleStatusClick(paciente)}
                              title="Reativar paciente"
                              className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:border-emerald-300"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 pb-6 pt-4">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs h-7"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs h-7"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PacienteDialog
        open={pacienteDialogOpen}
        onOpenChange={setPacienteDialogOpen}
        paciente={editingPaciente}
        onSuccess={handleSuccess}
      />

      <PacienteDeleteDialog
        open={toggleStatusDialogOpen}
        onOpenChange={setToggleStatusDialogOpen}
        paciente={pacienteToToggle}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/pacientes"
        title="Upload de Pacientes em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos pacientes. O arquivo deve conter colunas: nome, cpf, data_nascimento, sexo, email, telefone, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}
