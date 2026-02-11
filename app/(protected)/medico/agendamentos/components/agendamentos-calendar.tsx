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

export function AgendamentosCalendar({
  agendamentos,
  onEventClick,
}: AgendamentosCalendarProps) {
  const router = useRouter();

  const events = useMemo(() => {
    return agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = new Date(dataHora);
      endTime.setMinutes(endTime.getMinutes() + 30); // Duração padrão de 30 minutos

      const title = `${agendamento.paciente.nome}${agendamento.tipoConsulta ? ` - ${agendamento.tipoConsulta.nome}` : ""}`;

      return {
        id: agendamento.id,
        title,
        start: dataHora,
        end: endTime,
        resource: agendamento,
      };
    });
  }, [agendamentos]);

  const eventStyleGetter = (event: any) => {
    const agendamento = event.resource as Agendamento;
    let backgroundColor = "#3174ad";
    let borderColor = "#3174ad";

    switch (agendamento.status) {
      case "AGENDADO":
        backgroundColor = "#3b82f6";
        borderColor = "#2563eb";
        break;
      case "CONFIRMADO":
        backgroundColor = "#10b981";
        borderColor = "#059669";
        break;
      case "EM_ATENDIMENTO":
        backgroundColor = "#f59e0b";
        borderColor = "#d97706";
        break;
      case "CONCLUIDO":
      case "REALIZADA":
        backgroundColor = "#6b7280";
        borderColor = "#4b5563";
        break;
      case "CANCELADO":
        backgroundColor = "#ef4444";
        borderColor = "#dc2626";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderRadius: "4px",
        color: "white",
        padding: "2px 4px",
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
    <div className="h-[600px] w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onSelectEvent={handleEventClick}
        selectable={false}
        eventPropGetter={eventStyleGetter}
        defaultView="week"
        views={["month", "week", "day", "agenda"]}
        messages={messages}
        culture="pt-BR"
      />
    </div>
  );
}
