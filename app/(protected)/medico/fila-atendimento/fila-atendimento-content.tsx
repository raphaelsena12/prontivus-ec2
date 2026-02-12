"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, User, Stethoscope, Loader2, ArrowRight, RefreshCw, Filter, List } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime, formatCPF } from "@/lib/utils";

interface Consulta {
  id: string;
  dataHora: Date | string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
    dataNascimento: string | Date | null;
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
}

export function FilaAtendimentoContent() {
  const router = useRouter();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConsultas = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await fetch("/api/medico/fila-atendimento");

      if (!response.ok) {
        throw new Error("Erro ao carregar fila de atendimento");
      }

      const data = await response.json();
      const consultasWithDates = (data.consultas || []).map((consulta: any) => ({
        ...consulta,
        dataHora: new Date(consulta.dataHora),
      }));
      setConsultas(consultasWithDates);
    } catch (error) {
      if (!silent) toast.error("Erro ao carregar fila de atendimento");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultas();
    const interval = setInterval(() => fetchConsultas(true), 30000);
    return () => clearInterval(interval);
  }, [fetchConsultas]);

  const handleIniciarAtendimento = async (consultaId: string) => {
    try {
      const response = await fetch("/api/medico/fila-atendimento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultaId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao iniciar atendimento");
      }

      toast.success("Atendimento iniciado com sucesso");
      router.push(`/medico/atendimento?consultaId=${consultaId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar atendimento");
      console.error(error);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <List className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Fila de Atendimento</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Visualize e gerencie os pacientes aguardando atendimento
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Pacientes Aguardando</CardTitle>
            {!loading && (
              <span className="text-xs text-muted-foreground ml-2">
                ({consultas.length} {consultas.length === 1 ? "paciente" : "pacientes"})
              </span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => fetchConsultas(true)}
            disabled={refreshing}
            className="h-8 text-xs"
            title="Atualizar fila"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden px-6 pt-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4 first:rounded-tl-lg">
                    Paciente
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    CPF
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    Horário
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    Procedimento
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    Tipo
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    Convênio
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 bg-slate-100 px-4 text-right last:rounded-tr-lg">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-xs py-3 px-4">
                      <div className="flex flex-col items-center gap-3 py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Carregando fila...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : consultas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-xs py-3 px-4">
                      <div className="flex flex-col items-center gap-3 py-12">
                        <User className="h-10 w-10 text-slate-200" />
                        <span className="text-xs text-slate-400">
                          Nenhum paciente aguardando atendimento
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  consultas.map((consulta, index) => (
                    <TableRow
                      key={consulta.id}
                      className="border-b border-border/30 hover:bg-neutral-50/50 transition-colors"
                    >
                      <TableCell className="text-xs py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {consulta.paciente.nome}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {consulta.paciente.telefone || consulta.paciente.celular || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        <span className="text-xs text-foreground font-mono">
                          {formatCPF(consulta.paciente.cpf)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-neutral-400" />
                          <span className="text-foreground font-medium">
                            {formatTime(consulta.dataHora)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        {consulta.codigoTuss ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono text-foreground">{consulta.codigoTuss.codigoTuss}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {consulta.codigoTuss.descricao}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        {consulta.tipoConsulta ? (
                          <span className="text-xs text-foreground">{consulta.tipoConsulta.nome}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        {consulta.operadora ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {consulta.operadora.nomeFantasia || consulta.operadora.razaoSocial}
                            </span>
                            {consulta.planoSaude && (
                              <span className="text-[10px] text-muted-foreground">
                                {consulta.planoSaude.nome}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Particular</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium leading-tight bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Aguardando
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIniciarAtendimento(consulta.id)}
                          className="text-xs h-7"
                        >
                          Iniciar
                          <ArrowRight className="h-3 w-3 mr-1.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
