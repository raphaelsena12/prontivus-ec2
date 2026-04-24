"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Edit, Users, Calendar, Ban, CheckCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconCircleCheckFilled, IconLoader, IconBrandWhatsapp } from "@tabler/icons-react";
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
import { formatDate, maskCPF } from "@/lib/utils";
import { brazilToday } from "@/lib/timezone-utils";
import { NovoAgendamentoModal } from "@/app/(protected)/secretaria/agendamentos/components/novo-agendamento-modal";
import { PageHeader } from "@/components/page-header";
import { PacienteToggleStatusDialog } from "./components/paciente-toggle-status-dialog";
import { PacienteDialog } from "./components/paciente-dialog";
import { WhatsAppDialog } from "./components/whatsapp-dialog";

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
  profissao: string | null;
  estadoCivil: string | null;
  observacoes: string | null;
  alergias: string | null;
  medicamentosEmUso: string | null;
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
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ativo");
  const [novoAgendamentoModalOpen, setNovoAgendamentoModalOpen] = useState(false);
  const [pacienteParaAgendar, setPacienteParaAgendar] = useState<string | null>(null);
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);
  const [pacienteToToggle, setPacienteToToggle] = useState<Paciente | null>(null);
  const [pacienteDialogOpen, setPacienteDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [pacienteWhatsapp, setPacienteWhatsapp] = useState<Paciente | null>(null);

  const fetchPacientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
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
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const handleToggleStatusClick = (paciente: Paciente) => {
    setPacienteToToggle(paciente);
    setToggleStatusDialogOpen(true);
  };

  const handleToggleSuccess = () => {
    fetchPacientes();
    setToggleStatusDialogOpen(false);
    setPacienteToToggle(null);
  };

  const handleCreate = () => {
    setEditingPaciente(null);
    setPacienteDialogOpen(true);
  };

  const handlePacienteSuccess = () => {
    fetchPacientes();
    setPacienteDialogOpen(false);
    setEditingPaciente(null);
  };

  const handleViewPaciente = async (pacienteId: string) => {
    try {
      // Buscar dados completos do paciente
      const response = await fetch(`/api/secretaria/pacientes/${pacienteId}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Status:", response.status, "Body:", errorBody);
        throw new Error(errorBody.error || "Erro ao carregar paciente");
      }
      const data = await response.json();
      setEditingPaciente(data.paciente);
      setPacienteDialogOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do paciente");
      console.error(error);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Users}
        title="Pacientes"
        subtitle="Gerencie o cadastro de pacientes e visualize informações importantes"
      />

      <div className="flex flex-col">
        {/* Campo de busca e botão */}
        <div className="flex items-center justify-end gap-2 pb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Conteúdo */}
        <div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Nº Prontuário</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <span className="text-xs text-muted-foreground">Carregando pacientes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground opacity-50" />
                        <span className="text-xs text-muted-foreground">Nenhum paciente encontrado</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pacientes.map((paciente) => (
                    <TableRow key={paciente.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-3 font-semibold">
                        {paciente.numeroProntuario ? String(paciente.numeroProntuario).padStart(6, "0") : "-"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div 
                          className="flex items-center cursor-pointer hover:opacity-80"
                          onClick={() => handleViewPaciente(paciente.id)}
                        >
                          <span className="font-medium">{paciente.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">{maskCPF(paciente.cpf)}</TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">
                        {paciente.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {paciente.celular || paciente.telefone || "-"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {formatDate(paciente.dataNascimento ? (typeof paciente.dataNascimento === 'string' ? new Date(paciente.dataNascimento) : paciente.dataNascimento) : null)}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {getStatusBadge(paciente.ativo)}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs px-2 shadow-sm"
                            onClick={() => {
                              // Formatar data de hoje no formato YYYY-MM-DD
                              const dataFormatada = brazilToday();
                              setPacienteParaAgendar(paciente.id);
                              setNovoAgendamentoModalOpen(true);
                            }}
                          >
                            <Calendar className="h-3 w-3" />
                            Agendar
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0 shadow-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewPaciente(paciente.id)}>
                                <Eye className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPaciente(paciente.id)}>
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Editar
                              </DropdownMenuItem>
                              {(paciente.celular || paciente.telefone) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPacienteWhatsapp(paciente);
                                    setWhatsappDialogOpen(true);
                                  }}
                                >
                                  <IconBrandWhatsapp className="mr-2 h-3.5 w-3.5 text-green-500" />
                                  WhatsApp
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {paciente.ativo ? (
                                <DropdownMenuItem onClick={() => handleToggleStatusClick(paciente)}>
                                  <Ban className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                  Inativar paciente
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleToggleStatusClick(paciente)}>
                                  <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                  Reativar paciente
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <NovoAgendamentoModal
        open={novoAgendamentoModalOpen}
        onOpenChange={(open) => {
          setNovoAgendamentoModalOpen(open);
          if (!open) {
            setPacienteParaAgendar(null);
          }
        }}
        onSuccess={() => {
          // Opcional: recarregar pacientes se necessário
        }}
        initialData={pacienteParaAgendar ? { 
          pacienteId: pacienteParaAgendar,
          data: brazilToday() // Data de hoje no formato YYYY-MM-DD
        } : undefined}
      />

      <PacienteToggleStatusDialog
        open={toggleStatusDialogOpen}
        onOpenChange={(open) => {
          setToggleStatusDialogOpen(open);
          if (!open) {
            setPacienteToToggle(null);
          }
        }}
        paciente={pacienteToToggle}
        onSuccess={handleToggleSuccess}
      />

      <PacienteDialog
        open={pacienteDialogOpen}
        onOpenChange={(open) => {
          setPacienteDialogOpen(open);
          if (!open) {
            setEditingPaciente(null);
          }
        }}
        paciente={editingPaciente}
        onSuccess={handlePacienteSuccess}
      />

      {pacienteWhatsapp && (
        <WhatsAppDialog
          open={whatsappDialogOpen}
          onOpenChange={(open) => {
            setWhatsappDialogOpen(open);
            if (!open) setPacienteWhatsapp(null);
          }}
          paciente={pacienteWhatsapp}
        />
      )}
    </div>
  );
}




