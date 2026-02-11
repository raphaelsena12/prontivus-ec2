"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, User, Stethoscope, Loader2, ArrowRight, RefreshCw } from "lucide-react";
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
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Header */}
        <div className="mx-4 lg:mx-6 pt-6 pb-0">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-8">
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-800 pb-2.5">
                Fila de Atendimento
              </h1>
              {!loading && (
                <span className="text-sm text-slate-400 pb-2.5">
                  {consultas.length} {consultas.length === 1 ? "paciente aguardando" : "pacientes aguardando"}
                </span>
              )}
            </div>

            <button
              onClick={() => fetchConsultas(true)}
              disabled={refreshing}
              className="mb-2.5 p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors rounded-md hover:bg-slate-100"
              title="Atualizar fila"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="h-px bg-slate-200" />
        </div>

        {/* Table */}
        <div className="px-4 lg:px-6 pt-5 pb-6">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="h-10 bg-slate-100 px-4 first:rounded-tl-lg">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paciente</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">CPF</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Horário</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Procedimento</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Convênio</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
                  </TableHead>
                  <TableHead className="h-10 bg-slate-100 px-4 text-right last:rounded-tr-lg">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-400">Carregando fila...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : consultas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <User className="h-10 w-10 text-slate-200" />
                        <span className="text-sm text-slate-400">
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
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">
                            {consulta.paciente.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {consulta.paciente.telefone || consulta.paciente.celular || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-sm text-foreground font-mono">
                          {formatCPF(consulta.paciente.cpf)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="text-foreground font-medium">
                            {formatTime(consulta.dataHora)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {consulta.codigoTuss ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-foreground">{consulta.codigoTuss.codigoTuss}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {consulta.codigoTuss.descricao}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {consulta.tipoConsulta ? (
                          <span className="text-sm text-foreground">{consulta.tipoConsulta.nome}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {consulta.operadora ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {consulta.operadora.nomeFantasia || consulta.operadora.razaoSocial}
                            </span>
                            {consulta.planoSaude && (
                              <span className="text-xs text-muted-foreground">
                                {consulta.planoSaude.nome}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Particular</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Aguardando
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIniciarAtendimento(consulta.id)}
                          className="h-8 text-xs font-medium text-neutral-600 hover:text-foreground hover:bg-neutral-100 gap-1.5"
                        >
                          Iniciar
                          <ArrowRight className="h-3 w-3" />
                        </Button>
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
