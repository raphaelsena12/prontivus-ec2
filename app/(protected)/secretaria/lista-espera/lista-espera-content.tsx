"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AvatarWithS3 } from "@/components/avatar-with-s3";
import { toast } from "sonner";
import { formatDate, formatCPF } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Phone, Clock, User, Stethoscope, Loader2, List } from "lucide-react";
import { AdicionarListaEsperaModal } from "./components/adicionar-lista-espera-modal";
import { ChamarPacienteModal } from "./components/chamar-paciente-modal";
import { PageHeader } from "@/components/page-header";

interface ListaEspera {
  id: string;
  prioridade: number;
  observacoes: string | null;
  createdAt: string | Date;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
    email: string | null;
    dataNascimento: string | Date;
    numeroProntuario: number | null;
  };
  medico: {
    id: string;
    usuario: {
      id: string;
      nome: string;
      avatar: string | null;
    };
    crm: string;
    especialidade: string;
  };
}

interface Medico {
  id: string;
  usuario: {
    id: string;
    nome: string;
    avatar: string | null;
  };
  crm?: string;
  especialidade?: string;
}

export function ListaEsperaContent() {
  const [listasEspera, setListasEspera] = useState<ListaEspera[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicoSelecionado, setMedicoSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listaEsperaToDelete, setListaEsperaToDelete] = useState<string | null>(null);
  const [adicionarModalOpen, setAdicionarModalOpen] = useState(false);
  const [chamarModalOpen, setChamarModalOpen] = useState(false);
  const [listaEsperaToChamar, setListaEsperaToChamar] = useState<ListaEspera | null>(null);

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

  const fetchListasEspera = useCallback(async () => {
    if (!medicoSelecionado) {
      setListasEspera([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        medicoId: medicoSelecionado,
      });

      const response = await fetch(`/api/secretaria/lista-espera?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar lista de espera");
      }

      const data = await response.json();
      setListasEspera(data.listasEspera || []);
    } catch (error) {
      toast.error("Erro ao carregar lista de espera");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [medicoSelecionado]);

  useEffect(() => {
    fetchListasEspera();
  }, [fetchListasEspera]);

  const handleDelete = async () => {
    if (!listaEsperaToDelete) return;

    try {
      const response = await fetch(`/api/secretaria/lista-espera/${listaEsperaToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao remover da lista de espera");
      }

      toast.success("Paciente removido da lista de espera com sucesso");
      setDeleteDialogOpen(false);
      setListaEsperaToDelete(null);
      fetchListasEspera();
    } catch (error) {
      toast.error("Erro ao remover da lista de espera");
      console.error(error);
    }
  };

  const handleChamar = (listaEspera: ListaEspera) => {
    setListaEsperaToChamar(listaEspera);
    setChamarModalOpen(true);
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPrioridadeBadge = (prioridade: number) => {
    if (prioridade === 0) {
      return (
        <Badge variant="outline" className="bg-transparent border-gray-300 text-gray-700 text-[10px] py-0.5 px-1.5">
          Normal
        </Badge>
      );
    } else if (prioridade === 1) {
      return (
        <Badge variant="outline" className="bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5">
          Alta
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 text-[10px] py-0.5 px-1.5">
          Urgente
        </Badge>
      );
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Clock}
        title="Lista de Espera"
        subtitle="Gerencie a lista de espera dos médicos e organize os atendimentos"
      />

      <div className="flex flex-col space-y-4">
        {/* Seletor de Médicos */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Selecione o Médico</CardTitle>
                  <CardDescription className="text-xs">
                    Escolha o médico para visualizar sua lista de espera
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setAdicionarModalOpen(true)}
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar à Lista
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMedicos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {medicos.map((medico) => (
                    <button
                      key={medico.id}
                      onClick={() => setMedicoSelecionado(medico.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        medicoSelecionado === medico.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <AvatarWithS3
                        avatar={medico.usuario.avatar}
                        alt={medico.usuario.nome}
                        fallback={getInitials(medico.usuario.nome)}
                        className="h-10 w-10"
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium">{medico.usuario.nome}</p>
                        {medico.crm && (
                          <p className="text-xs text-muted-foreground">CRM: {medico.crm}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Espera */}
        <div className="pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pacientes na Lista de Espera</CardTitle>
              <CardDescription className="text-xs">
                {medicoSelecionado
                  ? `Lista de espera do médico selecionado (${listasEspera.length} paciente${listasEspera.length !== 1 ? "s" : ""})`
                  : "Selecione um médico para visualizar a lista de espera"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !medicoSelecionado ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Stethoscope className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Selecione um médico acima para visualizar a lista de espera
                  </p>
                </div>
              ) : listasEspera.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum paciente na lista de espera deste médico
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Prioridade</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Data de Entrada</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listasEspera.map((lista) => (
                        <TableRow key={lista.id}>
                          <TableCell>
                            {getPrioridadeBadge(lista.prioridade)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{lista.paciente.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCPF(lista.paciente.cpf)}
                                  {lista.paciente.numeroProntuario && (
                                    <> • Pront: {lista.paciente.numeroProntuario}</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {lista.paciente.celular || lista.paciente.telefone ? (
                                <>
                                  <p className="font-medium">
                                    {lista.paciente.celular || lista.paciente.telefone}
                                  </p>
                                  {lista.paciente.email && (
                                    <p className="text-xs text-muted-foreground">
                                      {lista.paciente.email}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-muted-foreground">Sem contato</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(new Date(lista.createdAt))}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(lista.createdAt).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lista.observacoes ? (
                              <p className="text-sm text-muted-foreground max-w-xs truncate">
                                {lista.observacoes}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">-</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => handleChamar(lista)}
                                size="sm"
                                variant="default"
                                className="h-8"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                Chamar
                              </Button>
                              <Button
                                onClick={() => {
                                  setListaEsperaToDelete(lista.id);
                                  setDeleteDialogOpen(true);
                                }}
                                size="sm"
                                variant="destructive"
                                className="h-8"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
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
      </div>

      {/* Modal de Adicionar */}
      <AdicionarListaEsperaModal
        open={adicionarModalOpen}
        onOpenChange={setAdicionarModalOpen}
        onSuccess={(medicoIdAdicionado) => {
          setAdicionarModalOpen(false);
          // Se o paciente foi adicionado para um médico diferente, atualizar a seleção
          if (medicoIdAdicionado && medicoIdAdicionado !== medicoSelecionado) {
            setMedicoSelecionado(medicoIdAdicionado);
            // O useEffect vai recarregar automaticamente quando medicoSelecionado mudar
          } else {
            // Se for o mesmo médico, recarregar manualmente
            fetchListasEspera();
          }
        }}
        medicos={medicos}
      />

      {/* Modal de Chamar Paciente */}
      {listaEsperaToChamar && (
        <ChamarPacienteModal
          open={chamarModalOpen}
          onOpenChange={setChamarModalOpen}
          listaEspera={listaEsperaToChamar}
          onSuccess={() => {
            fetchListasEspera();
            setChamarModalOpen(false);
            setListaEsperaToChamar(null);
          }}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Lista de Espera</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este paciente da lista de espera? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

