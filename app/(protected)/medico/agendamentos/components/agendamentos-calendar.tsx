"use client";

import { useMemo, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, View, ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

interface Agendamento {
  id: string;
  dataHora: Date;
  dataHoraFim?: Date | string | null;
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
  procedimento: {
    id: string;
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

interface AgendamentosCalendarProps {
  agendamentos: Agendamento[];
  onEventClick?: (agendamento: Agendamento) => void;
  toolbarActions?: React.ReactNode;
}

// Função para obter cor por status da consulta
const getStatusColor = (status: string): { bg: string; border: string } => {
  switch (status) {
    case "AGENDADA":
    case "AGENDADO":
      return { bg: "#3b82f6", border: "#2563eb" }; // Azul
    case "CONFIRMADA":
    case "CONFIRMADO":
      return { bg: "#22c55e", border: "#16a34a" }; // Verde
    case "CANCELADA":
    case "CANCELADO":
      return { bg: "#ef4444", border: "#dc2626" }; // Vermelho
    case "REALIZADA":
    case "CONCLUIDO":
      return { bg: "#6b7280", border: "#4b5563" }; // Cinza
    case "AGUARDANDO_APROVACAO":
      return { bg: "#f59e0b", border: "#d97706" }; // Âmbar
    default:
      return { bg: "#6b7280", border: "#4b5563" }; // Cinza padrão
  }
};

const STATUS_LEGENDA = [
  { status: "AGENDADA", label: "Agendada" },
  { status: "CONFIRMADA", label: "Confirmada" },
  { status: "AGUARDANDO_APROVACAO", label: "Aguardando aprovação" },
  { status: "REALIZADA", label: "Realizada" },
  { status: "CANCELADA", label: "Cancelada" },
];

const VIEW_OPTIONS: { key: View; label: string }[] = [
  { key: Views.AGENDA, label: "Agenda" },
  { key: Views.DAY, label: "Dia" },
  { key: Views.WEEK, label: "Semana" },
  { key: Views.MONTH, label: "Mês" },
];

function makeCustomToolbar(actions?: React.ReactNode) {
  return function CustomToolbar(props: ToolbarProps) {
    const { label, onNavigate, onView, view } = props;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        {/* Esquerda: navegação */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("PREV")}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => onNavigate("TODAY")}
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("NEXT")}
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Centro: label */}
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-foreground capitalize">
            {label}
          </span>
        </div>

        {/* Direita: segmented control + actions */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const active = view === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onView(opt.key)}
                  className={cn(
                    "h-7 rounded-md px-3 text-xs font-medium transition-all",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
      </div>
    );
  };
}

export function AgendamentosCalendar({
  agendamentos,
  onEventClick,
  toolbarActions,
}: AgendamentosCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(Views.AGENDA);
  const [date, setDate] = useState<Date>(new Date());

  const handleView = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const toolbarComponent = useMemo(() => makeCustomToolbar(toolbarActions), [toolbarActions]);

  const events = useMemo(() => {
    const agora = new Date();
    
    return agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = agendamento.dataHoraFim
        ? new Date(agendamento.dataHoraFim)
        : (() => { const e = new Date(dataHora); e.setMinutes(e.getMinutes() + 30); return e; })();

      const statusConcluido = agendamento.status === "CONCLUIDO" || agendamento.status === "REALIZADA";
      const estaAtrasado = dataHora < agora && !statusConcluido;

      const tipoNome = agendamento.tipoConsulta?.nome;
      const procedimento = agendamento.procedimento?.nome;
      const detalhes = [tipoNome, procedimento].filter(Boolean).join(" • ");
      const title = `${agendamento.paciente.nome}${detalhes ? ` — ${detalhes}` : ""}`;

      return {
        id: agendamento.id,
        title,
        start: dataHora,
        end: endTime,
        resource: agendamento,
        tipo: "agendamento" as const,
        tipoConsulta: agendamento.tipoConsulta?.nome || null,
        estaAtrasado,
      };
    });
  }, [agendamentos]);

  const eventStyleGetter = (event: any) => {
    const agendamento = event.resource as Agendamento;
    const tipoCor = getStatusColor(agendamento.status);
    const atrasado = !!event.estaAtrasado;

    return {
      style: {
        backgroundColor: tipoCor.bg,
        border: "none",
        borderLeft: atrasado ? "3px solid rgba(0,0,0,0.45)" : `2px solid ${tipoCor.border}`,
        borderRadius: "4px",
        color: "white",
        padding: "2px 6px",
        fontSize: "13px",
        lineHeight: "1.25",
        fontWeight: 500,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      },
    };
  };

  const handleEventClick = (event: any) => {
    if (onEventClick) {
      onEventClick(event.resource);
    } else {
      // Por padrão, redireciona para iniciar atendimento se estiver confirmado
      const agendamento = event.resource as Agendamento;
      if (agendamento.status === "AGENDADO" || agendamento.status === "CONFIRMADO") {
        router.push(`/medico/atendimento?consultaId=${agendamento.id}`);
      }
    }
  };

  const messages = {
    next: "Próximo",
    previous: "Anterior",
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    date: "Data",
    time: "Hora",
    event: "Evento",
    noEventsInRange: "Não há agendamentos neste período.",
    showMore: (total: number) => `+${total} mais`,
  };

  return (
    <div className="flex flex-col w-full">
      {/* Calendário */}
      <div className="flex flex-col min-h-[640px] w-full calendar-modern">
        <style dangerouslySetInnerHTML={{__html: `
          .calendar-modern {
            --cal-line: #f1f3f5;
            --cal-line-strong: #e7eaee;
          }
          .calendar-modern .rbc-calendar {
            font-size: 13px;
            font-family: inherit;
          }
          .calendar-modern .rbc-header {
            padding: 10px 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: hsl(var(--muted-foreground));
            border-bottom: 1px solid var(--cal-line-strong);
            background: transparent;
          }
          .calendar-modern .rbc-header + .rbc-header {
            border-left: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-month-view,
          .calendar-modern .rbc-time-view,
          .calendar-modern .rbc-agenda-view {
            border: 1px solid var(--cal-line-strong);
            border-radius: 8px;
            overflow: hidden;
            background: hsl(var(--background));
          }
          /* Mês: divisórias de linhas e colunas */
          .calendar-modern .rbc-month-row + .rbc-month-row {
            border-top: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid var(--cal-line);
          }
          /* Semana/Dia: divisórias verticais entre colunas de dias */
          .calendar-modern .rbc-time-content > * + * > * {
            border-left: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid transparent;
          }
          .calendar-modern .rbc-timeslot-group {
            border-bottom: 1px solid var(--cal-line);
            min-height: 40px;
          }
          .calendar-modern .rbc-time-header.rbc-overflowing {
            border-right: none;
          }
          .calendar-modern .rbc-time-header-content {
            border-left: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-time-header-content > .rbc-row.rbc-row-resource {
            border-bottom: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-off-range-bg {
            background: hsl(var(--muted) / 0.35);
          }
          .calendar-modern .rbc-off-range {
            color: hsl(var(--muted-foreground) / 0.6);
          }
          .calendar-modern .rbc-today {
            background-color: hsl(var(--primary) / 0.05) !important;
          }
          .calendar-modern .rbc-date-cell {
            padding: 6px 8px;
            font-size: 12px;
            font-weight: 500;
            color: hsl(var(--foreground));
            text-align: right;
          }
          .calendar-modern .rbc-date-cell.rbc-now > button {
            color: hsl(var(--primary));
            font-weight: 700;
          }
          .calendar-modern .rbc-time-gutter,
          .calendar-modern .rbc-time-header-gutter {
            font-size: 11px;
            color: hsl(var(--muted-foreground));
          }
          .calendar-modern .rbc-time-gutter .rbc-timeslot-group {
            border-bottom: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-time-slot {
            border-top: 1px solid transparent;
          }
          .calendar-modern .rbc-timeslot-group > .rbc-time-slot + .rbc-time-slot {
            border-top: 1px dashed var(--cal-line);
          }
          .calendar-modern .rbc-time-content {
            border-top: 1px solid var(--cal-line-strong);
          }
          .calendar-modern .rbc-current-time-indicator {
            background-color: hsl(var(--primary));
            height: 2px;
          }
          .calendar-modern .rbc-event {
            font-size: 12px !important;
            line-height: 1.25 !important;
            padding: 2px 6px !important;
          }
          .calendar-modern .rbc-event-label {
            font-size: 11px;
            opacity: 0.9;
          }
          .calendar-modern .rbc-agenda-view table.rbc-agenda-table {
            font-size: 13px;
          }
          .calendar-modern .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
            padding: 10px 12px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: hsl(var(--muted-foreground));
            font-weight: 600;
            border-bottom: 1px solid hsl(var(--border));
          }
          .calendar-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
            padding: 10px 12px;
            border-bottom: 1px solid hsl(var(--border) / 0.6);
          }
          .calendar-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
            background: hsl(var(--muted) / 0.4);
          }
          .calendar-modern .rbc-show-more {
            font-size: 11px;
            font-weight: 500;
            color: hsl(var(--primary));
            background: transparent;
          }
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "640px" }}
          onSelectEvent={handleEventClick}
          selectable={false}
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={handleView}
          date={date}
          onNavigate={handleNavigate}
          views={["agenda", "day", "week", "month"]}
          components={{ toolbar: toolbarComponent }}
          messages={messages}
          culture="pt-BR"
          step={10}
          timeslots={1}
          min={new Date(2000, 0, 1, 6, 0)}
          max={new Date(2000, 0, 1, 23, 0)}
        />

        {/* Legenda discreta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {STATUS_LEGENDA.map(({ status, label }) => {
            const cor = getStatusColor(status);
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cor.bg }}
                />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-[3px] rounded-sm"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            />
            <span className="text-[11px] text-muted-foreground">Atrasada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
