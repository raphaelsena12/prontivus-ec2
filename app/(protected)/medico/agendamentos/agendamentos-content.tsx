"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, List, CalendarDays, Printer } from "lucide-react";
import { toast } from "sonner";
import { AgendamentosTable } from "./components/agendamentos-table";
import { AgendamentosCalendar } from "./components/agendamentos-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-4 lg:mx-6 rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize e gerencie seus agendamentos
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleImprimirAgenda}
              disabled={loading || agendamentos.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Agenda
            </Button>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "table")} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="mr-2 h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Calendário de Agendamentos</CardTitle>
                  <CardDescription>
                    Visualize seus agendamentos em formato de calendário
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-[600px]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Carregando agendamentos...</p>
                      </div>
                    </div>
                  ) : agendamentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[600px]">
                      <p className="text-muted-foreground text-center">Nenhum agendamento encontrado</p>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Lista de Agendamentos</CardTitle>
                  <CardDescription>
                    {agendamentos.length} {agendamentos.length === 1 ? "agendamento encontrado" : "agendamentos encontrados"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Carregando agendamentos...</p>
                      </div>
                    </div>
                  ) : agendamentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground text-center">Nenhum agendamento encontrado</p>
                    </div>
                  ) : (
                    <AgendamentosTable
                      data={agendamentos}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

