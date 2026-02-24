"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { CheckCircle2 } from "lucide-react";

interface Agendamento {
  id: string;
  dataHora: Date;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
  };
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

export function AprovacoesContent() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovarDialogOpen, setAprovarDialogOpen] = useState(false);
  const [reprovarDialogOpen, setReprovarDialogOpen] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");

  const fetchAprovacoes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/medico/aprovacoes");

      if (!response.ok) {
        throw new Error("Erro ao carregar aprovações");
      }

      const data = await response.json();
      // Converter strings de data para objetos Date
      const agendamentosWithDates = (data.agendamentos || []).map((ag: any) => ({
        ...ag,
        dataHora: new Date(ag.dataHora),
      }));
      setAgendamentos(agendamentosWithDates);
    } catch (error) {
      toast.error("Erro ao carregar aprovações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAprovacoes();
  }, [fetchAprovacoes]);

  const handleAprovar = async () => {
    if (!agendamentoSelecionado) return;

    try {
      const response = await fetch(
        `/api/medico/aprovacoes/${agendamentoSelecionado.id}/aprovar`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao aprovar agendamento");
      }

      toast.success("Agendamento aprovado com sucesso");
      setAprovarDialogOpen(false);
      setAgendamentoSelecionado(null);
      fetchAprovacoes();
    } catch (error) {
      toast.error("Erro ao aprovar agendamento");
      console.error(error);
    }
  };

  const handleReprovar = async () => {
    if (!agendamentoSelecionado) return;

    try {
      const response = await fetch(
        `/api/medico/aprovacoes/${agendamentoSelecionado.id}/reprovar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motivo: motivoReprovacao || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao reprovar agendamento");
      }

      toast.success("Agendamento reprovado");
      setReprovarDialogOpen(false);
      setAgendamentoSelecionado(null);
      setMotivoReprovacao("");
      fetchAprovacoes();
    } catch (error) {
      toast.error("Erro ao reprovar agendamento");
      console.error(error);
    }
  };

  // Extrair motivo de aprovação das observações
  const getMotivoAprovacao = (observacoes: string | null) => {
    if (!observacoes) return null;
    const match = observacoes.match(/\[Motivo para aprovação: (.+?)\]/);
    return match ? match[1] : null;
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={CheckCircle2}
        title="Aprovações"
        subtitle="Aprove ou reprove agendamentos que requerem sua autorização"
      />

      <Card className="border-border/60 shadow-sm">
        <CardContent className="px-4 pt-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary/20 border-t-primary"></div>
                <span className="text-xs text-muted-foreground font-medium">
                  Carregando aprovações...
                </span>
              </div>
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <CheckCircle2 className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <div className="space-y-1 mt-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  Nenhuma aprovação pendente
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  Não há agendamentos aguardando sua aprovação no momento
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Data
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Hora
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Paciente
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Tipo de Consulta
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Código TUSS
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Convênio
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-muted-foreground">
                      Motivo
                    </TableHead>
                    <TableHead className="text-xs font-semibold py-3 text-right text-muted-foreground">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentos.map((agendamento) => {
                    const motivo = getMotivoAprovacao(agendamento.observacoes);
                    return (
                      <TableRow
                        key={agendamento.id}
                        className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0"
                      >
                        <TableCell className="text-xs py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground/60" />
                            <span className="font-medium">
                              {formatDate(agendamento.dataHora)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground/60" />
                            <span className="font-medium">
                              {formatTime(agendamento.dataHora)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {agendamento.paciente.nome}
                            </span>
                            {agendamento.paciente.telefone && (
                              <span className="text-[10px] text-muted-foreground/70">
                                {agendamento.paciente.telefone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          <span className="text-foreground/90">
                            {agendamento.tipoConsulta?.nome || (
                              <span className="text-muted-foreground/60">-</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          {agendamento.codigoTuss ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground">
                                {agendamento.codigoTuss.codigoTuss}
                              </span>
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
                            <Badge
                              variant="outline"
                              className="bg-transparent border-blue-500/60 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight font-normal"
                            >
                              {agendamento.operadora.nomeFantasia ||
                                agendamento.operadora.razaoSocial}
                              {agendamento.planoSaude && (
                                <span className="ml-1 opacity-80">
                                  - {agendamento.planoSaude.nome}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-transparent border-muted-foreground/40 text-muted-foreground text-[10px] py-0.5 px-1.5 leading-tight font-normal"
                            >
                              Particular
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3">
                          {motivo ? (
                            <div className="flex items-start gap-1.5 max-w-[250px]">
                              <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span className="text-[10px] text-orange-700 dark:text-orange-400">
                                {motivo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-3 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 text-green-700 hover:text-green-700 transition-all"
                              onClick={() => {
                                setAgendamentoSelecionado(agendamento);
                                setAprovarDialogOpen(true);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-3 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 text-destructive hover:text-destructive transition-all"
                              onClick={() => {
                                setAgendamentoSelecionado(agendamento);
                                setReprovarDialogOpen(true);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reprovar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Aprovar */}
      <AlertDialog open={aprovarDialogOpen} onOpenChange={setAprovarDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Aprovar Agendamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80">
              Tem certeza que deseja aprovar este agendamento? O paciente receberá uma
              confirmação por email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAprovar}
              className="text-xs h-8 bg-green-600 hover:bg-green-700"
            >
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Reprovar */}
      <AlertDialog open={reprovarDialogOpen} onOpenChange={setReprovarDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Reprovar Agendamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80">
              Tem certeza que deseja reprovar este agendamento? Ele será cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="motivo" className="text-xs">
              Motivo da reprovação (opcional)
            </Label>
            <Textarea
              id="motivo"
              value={motivoReprovacao}
              onChange={(e) => setMotivoReprovacao(e.target.value)}
              placeholder="Digite o motivo da reprovação..."
              className="text-xs min-h-[80px]"
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="text-xs h-8"
              onClick={() => setMotivoReprovacao("")}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReprovar}
              className="text-xs h-8 bg-destructive hover:bg-destructive/90"
            >
              Confirmar Reprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
