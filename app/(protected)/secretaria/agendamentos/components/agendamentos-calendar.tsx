"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useRouter } from "next/navigation";

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

interface AgendamentosCalendarProps {
  agendamentos: Agendamento[];
  bloqueios?: BloqueioAgenda[];
  escalas?: Array<{
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
  }>;
  onEventClick?: (agendamento: Agendamento) => void;
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void;
}

// Função para obter cor por status da consulta
const getStatusColor = (status: string): { bg: string; border: string } => {
  switch (status) {
    case "AGENDADA":
      return { bg: "#3b82f6", border: "#2563eb" }; // Azul
    case "CONFIRMADA":
      return { bg: "#22c55e", border: "#16a34a" }; // Verde
    case "CANCELADA":
      return { bg: "#ef4444", border: "#dc2626" }; // Vermelho
    case "REALIZADA":
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

export function AgendamentosCalendar({
  agendamentos,
  bloqueios = [],
  escalas = [],
  onEventClick,
  onSlotSelect,
}: AgendamentosCalendarProps) {
  const router = useRouter();

  const escalaPorDia = useMemo(() => {
    const map = new Map<number, Array<{ inicio: number; fim: number }>>();
    for (const escala of escalas) {
      const [hIni, mIni] = escala.horaInicio.split(":").map(Number);
      const [hFim, mFim] = escala.horaFim.split(":").map(Number);
      const item = { inicio: hIni * 60 + mIni, fim: hFim * 60 + mFim };
      const lista = map.get(escala.diaSemana) || [];
      lista.push(item);
      map.set(escala.diaSemana, lista);
    }
    return map;
  }, [escalas]);

  const isSlotDisponivel = (date: Date) => {
    const diaSemana = date.getDay();
    const faixas = escalaPorDia.get(diaSemana) || [];
    if (faixas.length === 0) return false;
    const minutos = date.getHours() * 60 + date.getMinutes();
    return faixas.some((faixa) => minutos >= faixa.inicio && minutos < faixa.fim);
  };

  const events = useMemo(() => {
    const agendamentosEvents = agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = agendamento.dataHoraFim
        ? new Date(agendamento.dataHoraFim)
        : (() => { const e = new Date(dataHora); e.setMinutes(e.getMinutes() + 30); return e; })();

      const title = `${agendamento.paciente.nome}${agendamento.tipoConsulta ? ` - ${agendamento.tipoConsulta.nome}` : ""}`;

      return {
        id: agendamento.id,
        title,
        start: dataHora,
        end: endTime,
        resource: agendamento,
        tipo: "agendamento" as const,
        tipoConsulta: agendamento.tipoConsulta?.nome || null,
      };
    });

    const bloqueiosEvents = bloqueios.map((bloqueio) => {
      // Combinar data e hora para criar DateTime
      let dataInicio: Date;
      let dataFim: Date;

      if (bloqueio.dataInicio instanceof Date) {
        const dataStr = bloqueio.dataInicio.toISOString().split("T")[0];
        dataInicio = new Date(`${dataStr}T${bloqueio.horaInicio}:00`);
      } else {
        const dataStr = bloqueio.dataInicio.split("T")[0];
        dataInicio = new Date(`${dataStr}T${bloqueio.horaInicio}:00`);
      }

      if (bloqueio.dataFim instanceof Date) {
        const dataStr = bloqueio.dataFim.toISOString().split("T")[0];
        dataFim = new Date(`${dataStr}T${bloqueio.horaFim}:00`);
      } else {
        const dataStr = bloqueio.dataFim.split("T")[0];
        dataFim = new Date(`${dataStr}T${bloqueio.horaFim}:00`);
      }

      const title = `🚫 Bloqueio - Dr(a). ${bloqueio.medico.usuario.nome}${bloqueio.observacoes ? ` - ${bloqueio.observacoes}` : ""}`;

      return {
        id: `bloqueio-${bloqueio.id}`,
        title,
        start: dataInicio,
        end: dataFim,
        resource: bloqueio,
        tipo: "bloqueio" as const,
      };
    });

    return [...agendamentosEvents, ...bloqueiosEvents];
  }, [agendamentos, bloqueios]);

  const eventStyleGetter = (event: any) => {
    // Se for um bloqueio, usar estilo diferente
    if (event.tipo === "bloqueio") {
      return {
        style: {
          backgroundColor: "#000000",
          borderColor: "#1a1a1a",
          borderWidth: "1px",
          borderRadius: "3px",
          color: "white",
          padding: "1px 3px",
          opacity: 0.8,
          fontWeight: "500",
          fontSize: "14px",
          lineHeight: "1.2",
        },
      };
    }

    // Estilo para agendamentos - cor baseada no status
    const agendamento = event.resource as Agendamento;
    const tipoCor = getStatusColor(agendamento.status);

    return {
      style: {
        backgroundColor: tipoCor.bg,
        borderColor: tipoCor.border,
        borderWidth: "1px",
        borderRadius: "3px",
        color: "white",
        padding: "1px 3px",
        fontSize: "10px",
        lineHeight: "1.2",
        fontWeight: "500",
      },
    };
  };

  const handleEventClick = (event: any) => {
    // Se for um bloqueio, não fazer nada (ou mostrar informações)
    if (event.tipo === "bloqueio") {
      return;
    }

    if (onEventClick) {
      onEventClick(event.resource);
    } else {
      router.push(`/secretaria/agendamentos/editar/${event.resource.id}`);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    if (!isSlotDisponivel(slotInfo.start)) {
      return;
    }
    if (onSlotSelect) {
      onSlotSelect(slotInfo);
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
    <div className="w-full">
      {/* Legenda */}
      <div className="mb-3 flex flex-wrap gap-3">
        {STATUS_LEGENDA.map(({ status, label }) => {
          const cor = getStatusColor(status);
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded border"
                style={{ backgroundColor: cor.bg, borderColor: cor.border }}
              />
              <span className="text-[13px] text-foreground font-medium">{label}</span>
            </div>
          );
        })}
        {/* Bloqueio */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded border"
            style={{ backgroundColor: "#000000", borderColor: "#1a1a1a" }}
          />
          <span className="text-[13px] text-foreground font-medium">Bloqueio</span>
        </div>
      </div>

      {/* Calendário com estilos customizados */}
      <div className="h-[500px] w-full calendar-compact">
        <style dangerouslySetInnerHTML={{__html: `
          .calendar-compact .rbc-calendar {
            font-size: 15px !important;
          }
          .calendar-compact .rbc-toolbar {
            font-size: 14px !important;
            position: relative !important;
            z-index: 10 !important;
          }
          .calendar-compact .rbc-toolbar button {
            font-size: 14px !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            display: inline-block !important;
            visibility: visible !important;
            position: relative !important;
            z-index: 11 !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
          }
          .calendar-compact .rbc-toolbar button:hover {
            opacity: 0.8 !important;
            transform: scale(1.05) !important;
          }
          .calendar-compact .rbc-toolbar button:active {
            transform: scale(0.95) !important;
          }
          .calendar-compact .rbc-toolbar button:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
          }
          .calendar-compact .rbc-toolbar button.rbc-active {
            background-color: hsl(var(--primary)) !important;
            color: hsl(var(--primary-foreground)) !important;
            font-weight: 600 !important;
          }
          .calendar-compact .rbc-toolbar-label {
            font-size: 14px !important;
            font-weight: 600 !important;
          }
          .calendar-compact .rbc-header {
            font-size: 14px !important;
            padding: 4px 2px !important;
            font-weight: 600 !important;
          }
          .calendar-compact .rbc-time-header-content {
            font-size: 14px !important;
          }
          .calendar-compact .rbc-time-slot {
            font-size: 14px !important;
          }
          .calendar-compact .rbc-event {
            font-size: 14px !important;
            padding: 1px 3px !important;
            min-height: 16px !important;
            line-height: 1.2 !important;
            font-weight: 500 !important;
          }
          .calendar-compact .rbc-event-content {
            font-size: 14px !important;
            line-height: 1.2 !important;
          }
          .calendar-compact .rbc-event-label {
            font-size: 13px !important;
          }
          .calendar-compact .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid #e5e7eb !important;
          }
          .calendar-compact .rbc-time-content {
            border-top: 1px solid #d1d5db !important;
          }
          .calendar-compact .rbc-time-header-gutter {
            font-size: 14px !important;
            padding: 2px !important;
          }
          .calendar-compact .rbc-time-gutter {
            font-size: 14px !important;
          }
          .calendar-compact .rbc-day-slot {
            min-height: 50px !important;
          }
          .calendar-compact .rbc-time-view {
            border: 1px solid #e5e7eb !important;
          }
          .calendar-compact .rbc-today {
            background-color: rgba(0, 0, 0, 0.02) !important;
          }
          .calendar-compact .rbc-time-slot.slot-bloqueado {
            background-color: rgba(17, 24, 39, 0.08) !important;
            cursor: not-allowed !important;
          }
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleEventClick}
          onSelecting={(slotInfo) => isSlotDisponivel(slotInfo.start)}
          selectable
          eventPropGetter={eventStyleGetter}
          slotPropGetter={(date) => {
            if (!isSlotDisponivel(date)) {
              return {
                className: "slot-bloqueado",
              };
            }
            return {};
          }}
          defaultView="week"
          views={["month", "week", "day", "agenda"]}
          messages={messages}
          culture="pt-BR"
          step={10}
          timeslots={1}
          min={new Date(2000, 0, 1, 6, 0)}
          max={new Date(2000, 0, 1, 23, 0)}
        />
      </div>
    </div>
  );
}

