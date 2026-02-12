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
  onEventClick?: (agendamento: Agendamento) => void;
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void;
}

// Função para obter cor por tipo de consulta
const getTipoConsultaColor = (tipoNome: string | null | undefined): { bg: string; border: string } => {
  if (!tipoNome) {
    return { bg: "#6b7280", border: "#4b5563" }; // Cinza padrão
  }

  const tipoLower = tipoNome.toLowerCase();
  
  if (tipoLower.includes("primeira")) {
    return { bg: "#3b82f6", border: "#2563eb" }; // Azul
  } else if (tipoLower.includes("retorno")) {
    return { bg: "#10b981", border: "#059669" }; // Verde
  } else if (tipoLower.includes("urgência") || tipoLower.includes("urgencia")) {
    return { bg: "#ef4444", border: "#dc2626" }; // Vermelho
  } else if (tipoLower.includes("eletiva")) {
    return { bg: "#8b5cf6", border: "#7c3aed" }; // Roxo
  } else if (tipoLower.includes("seguimento")) {
    return { bg: "#f59e0b", border: "#d97706" }; // Laranja
  } else if (tipoLower.includes("telemedicina")) {
    return { bg: "#06b6d4", border: "#0891b2" }; // Ciano
  }
  
  return { bg: "#6b7280", border: "#4b5563" }; // Cinza padrão
};

// Função para obter todos os tipos únicos de consulta
const getTiposConsultaUnicos = (agendamentos: Agendamento[]): string[] => {
  const tipos = new Set<string>();
  agendamentos.forEach((ag) => {
    if (ag.tipoConsulta?.nome) {
      tipos.add(ag.tipoConsulta.nome);
    }
  });
  return Array.from(tipos).sort();
};

export function AgendamentosCalendar({
  agendamentos,
  bloqueios = [],
  onEventClick,
  onSlotSelect,
}: AgendamentosCalendarProps) {
  const router = useRouter();

  const events = useMemo(() => {
    const agendamentosEvents = agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = new Date(dataHora);
      endTime.setMinutes(endTime.getMinutes() + 30); // Duração padrão de 30 minutos

      const title = `${agendamento.paciente.nome}${agendamento.medico ? ` - Dr(a). ${agendamento.medico.usuario.nome}` : ""}`;

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
          backgroundColor: "#dc2626",
          borderColor: "#991b1b",
          borderWidth: "1px",
          borderRadius: "3px",
          color: "white",
          padding: "1px 3px",
          opacity: 0.8,
          fontWeight: "500",
          fontSize: "10px",
          lineHeight: "1.2",
        },
      };
    }

    // Estilo para agendamentos - cor baseada no tipo de consulta
    const agendamento = event.resource as Agendamento;
    const tipoCor = getTipoConsultaColor(agendamento.tipoConsulta?.nome);

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

  // Obter tipos únicos para a legenda
  const tiposUnicos = useMemo(() => getTiposConsultaUnicos(agendamentos), [agendamentos]);

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
      {tiposUnicos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {tiposUnicos.map((tipo) => {
            const cor = getTipoConsultaColor(tipo);
            return (
              <div key={tipo} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded border"
                  style={{
                    backgroundColor: cor.bg,
                    borderColor: cor.border,
                  }}
                />
                <span className="text-[10px] text-foreground font-medium">{tipo}</span>
              </div>
            );
          })}
          {/* Bloqueio */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded border"
              style={{
                backgroundColor: "#dc2626",
                borderColor: "#991b1b",
              }}
            />
            <span className="text-[10px] text-foreground font-medium">Bloqueio</span>
          </div>
        </div>
      )}

      {/* Calendário com estilos customizados */}
      <div className="h-[500px] w-full calendar-compact">
        <style dangerouslySetInnerHTML={{__html: `
          .calendar-compact .rbc-calendar {
            font-size: 11px !important;
          }
          .calendar-compact .rbc-toolbar {
            font-size: 10px !important;
            position: relative !important;
            z-index: 10 !important;
          }
          .calendar-compact .rbc-toolbar button {
            font-size: 10px !important;
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
            font-size: 10px !important;
            font-weight: 600 !important;
          }
          .calendar-compact .rbc-header {
            font-size: 10px !important;
            padding: 4px 2px !important;
            font-weight: 600 !important;
          }
          .calendar-compact .rbc-time-header-content {
            font-size: 10px !important;
          }
          .calendar-compact .rbc-time-slot {
            font-size: 10px !important;
          }
          .calendar-compact .rbc-event {
            font-size: 10px !important;
            padding: 1px 3px !important;
            min-height: 16px !important;
            line-height: 1.2 !important;
            font-weight: 500 !important;
          }
          .calendar-compact .rbc-event-content {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          .calendar-compact .rbc-event-label {
            font-size: 9px !important;
          }
          .calendar-compact .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid #e5e7eb !important;
          }
          .calendar-compact .rbc-time-content {
            border-top: 1px solid #d1d5db !important;
          }
          .calendar-compact .rbc-time-header-gutter {
            font-size: 10px !important;
            padding: 2px !important;
          }
          .calendar-compact .rbc-time-gutter {
            font-size: 10px !important;
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
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleEventClick}
          selectable
          eventPropGetter={eventStyleGetter}
          defaultView="week"
          views={["month", "week", "day", "agenda"]}
          messages={messages}
          culture="pt-BR"
          min={new Date(2000, 0, 1, 6, 0)}
          max={new Date(2000, 0, 1, 23, 0)}
        />
      </div>
    </div>
  );
}

