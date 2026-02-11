"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PacienteDeleteDialog } from "./components/paciente-delete-dialog";
import { PacienteDialog } from "./components/paciente-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";

interface Paciente {
  id: string;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pacienteDialogOpen, setPacienteDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pacienteToDelete, setPacienteToDelete] = useState<Paciente | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchPacientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: page.toString(), 
        limit: "10", 
        ...(search && { search }) 
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
  }, [page, search]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleEdit = async (paciente: Paciente) => {
    try {
      // Buscar dados completos do paciente
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

  const handleDeleteClick = (paciente: Paciente) => {
    setPacienteToDelete(paciente);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchPacientes();
    setPacienteDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingPaciente(null);
    setPacienteToDelete(null);
  };

  const handleCreate = () => {
    setEditingPaciente(null);
    setPacienteDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        <div className="flex items-center justify-end px-4 lg:px-6 pt-2 pb-4 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              placeholder="Buscar por nome, CPF ou email..." 
              value={search} 
              onChange={(e) => { 
                setSearch(e.target.value); 
                setPage(1); 
              }} 
              className="pl-9 h-8 text-xs bg-background" 
            />
          </div>
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="text-xs">
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload em Massa
          </Button>
          <Button onClick={handleCreate} className="text-xs">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo Paciente
          </Button>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Nome</TableHead>
                  <TableHead className="text-xs font-semibold py-3">CPF</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Email</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Data de Nascimento</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-3">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-3">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : pacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-3">
                      Nenhum paciente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pacientes.map((paciente) => (
                    <TableRow key={paciente.id}>
                      <TableCell className="font-medium text-xs py-3">{paciente.nome}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.cpf || "-"}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.email || "-"}</TableCell>
                      <TableCell className="text-xs py-3">{paciente.telefone || "-"}</TableCell>
                      <TableCell className="text-xs py-3">{formatDate(paciente.dataNascimento ? (typeof paciente.dataNascimento === 'string' ? new Date(paciente.dataNascimento) : paciente.dataNascimento) : null)}</TableCell>
                      <TableCell className="text-right text-xs py-3">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(paciente)}
                            title="Editar paciente"
                            className="text-xs h-7"
                          >
                            <Edit className="h-3 w-3 mr-1.5" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteClick(paciente)}
                            title="Excluir paciente"
                            className="text-xs h-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            Excluir
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 lg:px-6 pt-4">
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
      </div>

      <PacienteDialog
        open={pacienteDialogOpen}
        onOpenChange={setPacienteDialogOpen}
        paciente={editingPaciente}
        onSuccess={handleSuccess}
      />

      <PacienteDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        paciente={pacienteToDelete}
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
