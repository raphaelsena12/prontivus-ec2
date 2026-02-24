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

interface AgendamentosCalendarProps {
  agendamentos: Agendamento[];
  onEventClick?: (agendamento: Agendamento) => void;
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
    return { bg: "#ef4444", border: "#dc2626" }; // Vermelho
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
  onEventClick,
}: AgendamentosCalendarProps) {
  const router = useRouter();

  const events = useMemo(() => {
    const agora = new Date();
    
    return agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = new Date(dataHora);
      endTime.setMinutes(endTime.getMinutes() + 30); // Duração padrão de 30 minutos

      // Verificar se está atrasado
      // Um agendamento está atrasado se a data/hora já passou e não foi concluído/realizado
      const statusConcluido = agendamento.status === "CONCLUIDO" || agendamento.status === "REALIZADA";
      const estaAtrasado = dataHora < agora && !statusConcluido;
      const emoji = estaAtrasado ? "😢" : "😊";

      const title = `${emoji} ${agendamento.paciente.nome}${agendamento.tipoConsulta ? ` - ${agendamento.tipoConsulta.nome}` : ""}`;

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
  }, [agendamentos]);

  const eventStyleGetter = (event: any) => {
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
          fontSize: "14px",
        lineHeight: "1.2",
        fontWeight: "500",
      },
    };
  };

  // Obter tipos únicos para a legenda
  const tiposUnicos = useMemo(() => getTiposConsultaUnicos(agendamentos), [agendamentos]);

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
                <span className="text-[14px] text-foreground font-medium">{tipo}</span>
              </div>
            );
          })}
        </div>
      )}

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
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onSelectEvent={handleEventClick}
          selectable={false}
          eventPropGetter={eventStyleGetter}
          defaultView="day"
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
