"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, List, Loader2, Printer, Filter, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AgendamentosTable } from "./components/agendamentos-table";
import { AgendamentosCalendar } from "./components/agendamentos-calendar";
import { PageHeader } from "@/components/page-header";

interface Agendamento {
  id: string;
  dataHora: Date;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
    numeroProntuario: number | null;
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
}

export function AgendamentosContent() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "table">("calendar");

  const fetchAgendamentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });

      const response = await fetch(
        `/api/medico/agendamentos?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar agendamentos");
      }

      const data = await response.json();
      // Converter strings de data para objetos Date
      const agendamentosWithDates = (data.agendamentos || []).map((ag: any) => ({
        ...ag,
        dataHora: new Date(ag.dataHora),
      }));
      setAgendamentos(agendamentosWithDates);
    } catch (error) {
      toast.error("Erro ao carregar agendamentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  const handleAutorizarFechamentoCaixa = async () => {
    try {
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split("T")[0];

      const response = await fetch("/api/medico/fechamento-caixa/autorizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: dataFormatada,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao autorizar fechamento de caixa");
      }

      toast.success("Fechamento de caixa autorizado com sucesso! A secretária foi notificada.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao autorizar fechamento de caixa");
      console.error(error);
    }
  };

  const handleImprimirAgenda = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, permita pop-ups para imprimir a agenda");
      return;
    }

    // Ordenar agendamentos por data
    const agendamentosOrdenados = [...agendamentos].sort(
      (a, b) => a.dataHora.getTime() - b.dataHora.getTime()
    );

    // Formatar data atual
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Criar HTML para impressão
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Agenda - ${dataFormatada}</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1a1a1a;
            }
            .header p {
              margin: 5px 0;
              color: #666;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 12px;
              text-align: left;
              border: 1px solid #ddd;
              font-weight: bold;
              font-size: 12px;
            }
            td {
              padding: 10px;
              border: 1px solid #ddd;
              font-size: 12px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .status {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
              display: inline-block;
            }
            .status-agendado { background-color: #dbeafe; color: #1e40af; }
            .status-confirmado { background-color: #d1fae5; color: #065f46; }
            .status-em_atendimento { background-color: #fef3c7; color: #92400e; }
            .status-concluido { background-color: #e5e7eb; color: #374151; }
            .status-realizada { background-color: #e5e7eb; color: #374151; }
            .status-cancelado { background-color: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 11px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Agenda de Agendamentos</h1>
            <p>Impresso em: ${dataFormatada}</p>
            <p>Total de agendamentos: ${agendamentosOrdenados.length}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Prontuário</th>
                <th>Telefone</th>
                <th>Tipo de Consulta</th>
                <th>Código TUSS</th>
                <th>Convênio</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${agendamentosOrdenados.map((ag) => {
                const dataFormatada = ag.dataHora.toLocaleDateString("pt-BR");
                const horaFormatada = ag.dataHora.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const telefone = ag.paciente.telefone || ag.paciente.celular || "-";
                const prontuario = ag.paciente.numeroProntuario ? ag.paciente.numeroProntuario.toString() : "-";
                const tipoConsulta = ag.tipoConsulta?.nome || "-";
                const codigoTuss = ag.codigoTuss?.codigoTuss || "-";
                const convenio = ag.operadora
                  ? ag.operadora.nomeFantasia || ag.operadora.razaoSocial
                  : "Particular";
                const statusClass = `status-${ag.status.toLowerCase().replace("_", "-")}`;
                
                return `
                  <tr>
                    <td>${dataFormatada}</td>
                    <td>${horaFormatada}</td>
                    <td>${ag.paciente.nome}</td>
                    <td>${prontuario}</td>
                    <td>${telefone}</td>
                    <td>${tipoConsulta}</td>
                    <td>${codigoTuss}</td>
                    <td>${convenio}</td>
                    <td><span class="status ${statusClass}">${ag.status.replace("_", " ")}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Prontivus - Sistema de Gestão Médica</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Aguardar o conteúdo carregar antes de imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Calendar}
        title="Agendamentos"
        subtitle="Gerencie seus agendamentos e visualize sua agenda"
      />

      {/* Card Branco */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Agendamentos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Botão Autorizar Fechamento de Caixa */}
            <Button
              variant="default"
              onClick={handleAutorizarFechamentoCaixa}
              className="h-8 text-xs px-3"
              title="Autorizar Fechamento de Caixa"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Autorizar Fechamento de Caixa
            </Button>
            {/* Tabs */}
            <div className="flex items-center gap-1 -mb-px">
              <button
                onClick={() => setView("calendar")}
                className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                  view === "calendar"
                    ? 'text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />
                Calendário
                {view === "calendar" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800" />
                )}
              </button>
              <button
                onClick={() => setView("table")}
                className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                  view === "table"
                    ? 'text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-3.5 h-3.5 inline mr-1.5" />
                Lista
                {view === "table" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800" />
                )}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleImprimirAgenda}
              disabled={loading || agendamentos.length === 0}
              className="h-8 w-8 p-0"
              title="Imprimir Agenda"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tab Content */}
          <div className="min-h-[400px]">
            {view === "calendar" && (
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Carregando agendamentos...</span>
                    </div>
                  </div>
                ) : (
                  <AgendamentosCalendar
                    agendamentos={agendamentos}
                    onEventClick={(agendamento) => {
                      if (agendamento.status === "AGENDADO" || agendamento.status === "CONFIRMADO") {
                        router.push(`/medico/atendimento?consultaId=${agendamento.id}`);
                      }
                    }}
                  />
                )}
              </div>
            )}

            {view === "table" && (
              <div className="px-6 pt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Carregando agendamentos...</span>
                    </div>
                  </div>
                ) : agendamentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                        <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">
                          Nenhum agendamento encontrado
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          Não há agendamentos no momento
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AgendamentosTable
                    data={agendamentos}
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
