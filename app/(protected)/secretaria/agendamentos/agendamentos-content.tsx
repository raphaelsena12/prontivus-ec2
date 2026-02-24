"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, User, Plus, Edit, Trash2, List, CalendarDays, Ban, AlertCircle } from "lucide-react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";
import { AvatarWithS3 } from "@/components/avatar-with-s3";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgendamentosCalendar } from "./components/agendamentos-calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EditarAgendamentoModal } from "./components/editar-agendamento-modal";
import { BloqueioAgendaModal } from "./components/bloqueio-agenda-modal";
import { NovoAgendamentoModal } from "./components/novo-agendamento-modal";
import { PageHeader } from "@/components/page-header";

interface Agendamento {
  id: string;
  dataHora: Date;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
  };
  medico: {
    id: string;
    usuario: {
      nome: string;
    };
  } | null;
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  operadora: {
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
  planoSaude: {
    nome: string;
  } | null;
  valorCobrado: number | string | null;
  status: string;
  observacoes: string | null;
}

interface BloqueioAgenda {
  id: string;
  dataInicio: Date | string;
  horaInicio: string;
  dataFim: Date | string;
  horaFim: string;
  observacoes: string | null;
  medico: {
    id: string;
    usuario: {
      nome: string;
    };
  };
}

interface Medico {
  id: string;
  usuario: {
    id: string;
    nome: string;
    avatar?: string | null;
  };
  crm?: string;
  especialidade?: string;
}

export function AgendamentosContent() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicoSelecionado, setMedicoSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendamentoToDelete, setAgendamentoToDelete] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [agendamentoToEdit, setAgendamentoToEdit] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [bloqueioModalOpen, setBloqueioModalOpen] = useState(false);
  const [novoAgendamentoModalOpen, setNovoAgendamentoModalOpen] = useState(false);
  const [novoAgendamentoInitialData, setNovoAgendamentoInitialData] = useState<{
    data?: string;
    hora?: string;
    medicoId?: string;
  } | undefined>(undefined);

  // Carregar médicos ao montar o componente
  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        setLoadingMedicos(true);
        const response = await fetch("/api/admin-clinica/medicos");

        if (response.ok) {
          const data = await response.json();
          const medicosList = data.medicos || [];
          setMedicos(medicosList);
          // Selecionar o primeiro médico automaticamente apenas se nenhum estiver selecionado
          if (medicosList.length > 0 && medicoSelecionado === "") {
            setMedicoSelecionado(medicosList[0].id);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar médicos:", error);
      } finally {
        setLoadingMedicos(false);
      }
    };

    fetchMedicos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgendamentos = useCallback(async () => {
    // Não buscar agendamentos se nenhum médico estiver selecionado
    if (!medicoSelecionado) {
      setAgendamentos([]);
      setBloqueios([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        medicoId: medicoSelecionado, // Sempre incluir o médico selecionado
      });
      
      console.log("Buscando agendamentos para médico:", medicoSelecionado);

      // Buscar bloqueios para um período maior (mês atual) para garantir que apareçam no calendário
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const dataInicioBusca = primeiroDiaMes.toISOString().split("T")[0];
      const dataFimBusca = ultimoDiaMes.toISOString().split("T")[0];

      const bloqueiosParams = new URLSearchParams({
        dataInicio: dataInicioBusca,
        dataFim: dataFimBusca,
        medicoId: medicoSelecionado, // Sempre incluir o médico selecionado
      });

      const [agendamentosRes, bloqueiosRes] = await Promise.all([
        fetch(`/api/secretaria/agendamentos?${params.toString()}`),
        fetch(`/api/secretaria/bloqueios-agenda?${bloqueiosParams.toString()}`),
      ]);

      if (!agendamentosRes.ok) {
        throw new Error("Erro ao carregar agendamentos");
      }

      const agendamentosData = await agendamentosRes.json();
      // Converter strings de data para objetos Date
      const agendamentosWithDates = (agendamentosData.agendamentos || []).map((ag: any) => ({
        ...ag,
        dataHora: new Date(ag.dataHora),
      }));

      setAgendamentos(agendamentosWithDates);

      // Carregar bloqueios se a resposta foi ok
      if (bloqueiosRes.ok) {
        const bloqueiosData = await bloqueiosRes.json();
        const bloqueiosWithDates = (bloqueiosData.bloqueios || []).map((bl: any) => ({
          ...bl,
          dataInicio: new Date(bl.dataInicio),
          dataFim: new Date(bl.dataFim),
        }));

        setBloqueios(bloqueiosWithDates);
      }
    } catch (error) {
      toast.error("Erro ao carregar agendamentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [medicoSelecionado]);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/secretaria/agendamentos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Erro ao cancelar agendamento";
        
        // Se o agendamento já está cancelado, apenas atualizar a lista
        if (response.status === 400 && errorMessage.includes("já está cancelado")) {
          toast.info("Este agendamento já foi cancelado anteriormente");
          setDeleteDialogOpen(false);
          setAgendamentoToDelete(null);
          // Remover da lista local e recarregar
          setAgendamentos((prev) => prev.filter((ag) => ag.id !== id));
          fetchAgendamentos();
          return;
        }
        
        throw new Error(errorMessage);
      }

      toast.success("Agendamento cancelado com sucesso");
      setDeleteDialogOpen(false);
      setAgendamentoToDelete(null);
      
      // Remover imediatamente da lista local para feedback instantâneo
      setAgendamentos((prev) => prev.filter((ag) => ag.id !== id));
      
      // Recarregar para garantir sincronização
      fetchAgendamentos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao cancelar agendamento";
      toast.error(errorMessage);
      console.error("Erro ao cancelar agendamento:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AGENDADA":
      case "AGENDADO":
        return (
          <Badge variant="outline" className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <Clock className="mr-1 h-3 w-3" />
            Agendado
          </Badge>
        );
      case "CONFIRMADO":
        return (
          <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
            Confirmado
          </Badge>
        );
      case "EM_ATENDIMENTO":
        return (
          <Badge variant="outline" className="bg-transparent border-blue-500 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight">
            Em Atendimento
          </Badge>
        );
      case "CONCLUIDO":
        return (
          <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
            Concluído
          </Badge>
        );
      case "CANCELADA":
      case "CANCELADO":
        return (
          <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconLoader className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      case "AGUARDANDO_APROVACAO":
        return (
          <Badge variant="outline" className="bg-transparent border-orange-500 text-orange-700 dark:text-orange-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <AlertCircle className="mr-1 h-3 w-3" />
            Aguardando Aprovação
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
            {status.replace("_", " ")}
          </Badge>
        );
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={CalendarDays}
        title="Agendamentos"
        subtitle="Visualize e gerencie os agendamentos de consultas dos médicos"
      />

      <div className="flex flex-col space-y-4">
        {/* Seletor de Médicos - Grande com fotos */}
        <div>
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Selecione o médico</p>
            <ScrollArea className="w-full">
              <div className="flex items-center gap-3 pb-2">
                {/* Médicos */}
                {loadingMedicos ? (
                  <div className="flex items-center justify-center py-8 w-full">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  medicos.map((medico) => (
                    <button
                      key={medico.id}
                      onClick={() => setMedicoSelecionado(medico.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all min-w-[100px] ${
                        medicoSelecionado === medico.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <AvatarWithS3
                        avatar={medico.usuario.avatar}
                        alt={medico.usuario.nome}
                        fallback={getInitials(medico.usuario.nome)}
                        className={`w-16 h-16 border-2 ${
                          medicoSelecionado === medico.id
                            ? "border-primary"
                            : "border-border"
                        }`}
                        fallbackClassName={`text-sm font-semibold ${
                          medicoSelecionado === medico.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      />
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-medium text-center max-w-[90px] truncate ${
                          medicoSelecionado === medico.id ? "text-primary" : "text-foreground"
                        }`}>
                          {medico.usuario.nome}
                        </span>
                        {medico.especialidade && (
                          <span className="text-[10px] text-muted-foreground text-center max-w-[90px] truncate">
                            {medico.especialidade}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Barra de ações principais */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Tabs no estilo do atendimento */}
              <div className="flex items-center gap-1 -mb-px">
                <button
                  onClick={() => setView("calendar")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    view === "calendar"
                      ? 'text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 inline mr-1.5" />
                  Calendário
                  {view === "calendar" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800" />
                  )}
                </button>
                <button
                  onClick={() => setView("table")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    view === "table"
                      ? 'text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <List className="w-4 h-4 inline mr-1.5" />
                  Lista
                  {view === "table" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setBloqueioModalOpen(true)}
                className="text-xs h-8 border-border/60 hover:bg-muted/80 transition-colors"
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Bloqueio
              </Button>
              <Button 
                onClick={() => {
                  setNovoAgendamentoInitialData({
                    medicoId: medicoSelecionado || undefined,
                  });
                  setNovoAgendamentoModalOpen(true);
                }}
                className="text-xs h-8 shadow-sm hover:shadow transition-shadow"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo Agendamento
              </Button>
            </div>
          </div>
          <div className="border-b border-border/40"></div>
        </div>

        {/* Conteúdo principal */}
        <div className="pb-4">
          {/* Tab Content */}
          <div className="min-h-[400px]">
            {view === "calendar" && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-[600px]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary"></div>
                        <span className="text-xs text-muted-foreground font-medium">Carregando agendamentos...</span>
                      </div>
                    </div>
                  ) : (
                    <AgendamentosCalendar
                      agendamentos={agendamentos}
                      bloqueios={bloqueios}
                      onEventClick={(agendamento) => {
                        setAgendamentoToEdit(agendamento.id);
                        setEditModalOpen(true);
                      }}
                      onSlotSelect={(slotInfo) => {
                        const startDate = slotInfo.start.toISOString().split("T")[0];
                        const startTime = slotInfo.start.toTimeString().split(" ")[0].slice(0, 5);
                        setNovoAgendamentoInitialData({
                          data: startDate,
                          hora: startTime,
                          medicoId: medicoSelecionado || undefined,
                        });
                        setNovoAgendamentoModalOpen(true);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {view === "table" && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="px-4 pt-4 pb-4">
                  <div className="overflow-hidden rounded-md border border-border/60">
                    <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Hora</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Médico</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Tipo de Consulta</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Código TUSS</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Convênio</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary"></div>
                        <span className="text-xs text-muted-foreground font-medium">Carregando agendamentos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : agendamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                          <Calendar className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">
                            Nenhum agendamento encontrado
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {medicoSelecionado 
                              ? "Não há agendamentos para este médico no momento"
                              : "Selecione um médico para ver os agendamentos"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  agendamentos.map((agendamento) => (
                    <TableRow 
                      key={agendamento.id} 
                      className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0"
                    >
                      <TableCell className="text-xs py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground/60" />
                          <span className="font-medium">{formatDate(agendamento.dataHora)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <span className="font-medium">{formatTime(agendamento.dataHora)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{agendamento.paciente.nome}</span>
                          {agendamento.paciente.telefone && (
                            <span className="text-[10px] text-muted-foreground/70">
                              {agendamento.paciente.telefone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <span className="text-foreground/90">
                          {agendamento.medico?.usuario.nome || <span className="text-muted-foreground/60">-</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <span className="text-foreground/90">
                          {agendamento.tipoConsulta?.nome || <span className="text-muted-foreground/60">-</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {agendamento.codigoTuss ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">{agendamento.codigoTuss.codigoTuss}</span>
                            <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
                              {agendamento.codigoTuss.descricao}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {agendamento.operadora ? (
                          <Badge variant="outline" className="bg-transparent border-blue-500/60 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight font-normal">
                            {agendamento.operadora.nomeFantasia || agendamento.operadora.razaoSocial}
                            {agendamento.planoSaude && (
                              <span className="ml-1 opacity-80">- {agendamento.planoSaude.nome}</span>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-transparent border-muted-foreground/40 text-muted-foreground text-[10px] py-0.5 px-1.5 leading-tight font-normal">
                            Particular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {agendamento.valorCobrado ? (
                          <span className="font-medium text-foreground">
                            R$ {Number(agendamento.valorCobrado).toFixed(2).replace(".", ",")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">{getStatusBadge(agendamento.status)}</TableCell>
                      <TableCell className="text-xs py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 w-7 p-0 border-border/60 hover:bg-muted/80 hover:border-primary/50 transition-all"
                            onClick={() => {
                              setAgendamentoToEdit(agendamento.id);
                              setEditModalOpen(true);
                            }}
                            title="Editar"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 w-7 p-0 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 text-destructive hover:text-destructive transition-all"
                            onClick={() => {
                              setAgendamentoToDelete(agendamento.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                agendamentoToDelete && handleDelete(agendamentoToDelete)
              }
              className="text-xs h-8 bg-destructive hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditarAgendamentoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        agendamentoId={agendamentoToEdit}
        onSuccess={() => {
          fetchAgendamentos();
          setAgendamentoToEdit(null);
        }}
      />

      <BloqueioAgendaModal
        open={bloqueioModalOpen}
        onOpenChange={setBloqueioModalOpen}
        onSuccess={() => {
          fetchAgendamentos();
        }}
      />

      <NovoAgendamentoModal
        open={novoAgendamentoModalOpen}
        onOpenChange={(open) => {
          setNovoAgendamentoModalOpen(open);
          if (!open) {
            setNovoAgendamentoInitialData(undefined);
          }
        }}
        onSuccess={() => {
          fetchAgendamentos();
        }}
        initialData={novoAgendamentoInitialData}
      />
    </div>
  );
}

