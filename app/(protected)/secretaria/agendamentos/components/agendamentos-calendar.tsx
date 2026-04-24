"use client";

import { cn, formatDateToInput } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, type View, type ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  observacoes: string | null;
  encaixe?: boolean;
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
  excecoesEscala?: Array<{
    data: string;
    horaInicio: string | null;
    horaFim: string | null;
    ativo: boolean;
  }>;
  onEventClick?: (agendamento: Agendamento) => void;
  onBloqueioClick?: (bloqueio: BloqueioAgenda) => void;
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void;
  toolbarActions?: React.ReactNode;
}

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
  { status: "CANCELADA", label: "Cancelada" },
  { status: "REALIZADA", label: "Realizada" },
  { status: "ENCAIXE", label: "Encaixe" },
];

const getStatusColorComEncaixe = (status: string) => {
  if (status === "ENCAIXE") return { bg: "#f97316", border: "#ea580c" };
  return getStatusColor(status);
};

export function AgendamentosCalendar({
  agendamentos,
  bloqueios = [],
  escalas = [],
  excecoesEscala = [],
  onEventClick,
  onBloqueioClick,
  onSlotSelect,
  toolbarActions,
}: AgendamentosCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  const toolbarComponent = useMemo(() => makeCustomToolbar(toolbarActions), [toolbarActions]);

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

  const excecoesPorData = useMemo(() => {
    const map = new Map<string, Array<{ inicio: number; fim: number }>>();
    for (const exc of excecoesEscala) {
      if (!exc.ativo || !exc.horaInicio || !exc.horaFim) continue;
      const dataKey = new Date(exc.data).toISOString().split("T")[0];
      const [hIni, mIni] = exc.horaInicio.split(":").map(Number);
      const [hFim, mFim] = exc.horaFim.split(":").map(Number);
      const item = { inicio: hIni * 60 + mIni, fim: hFim * 60 + mFim };
      const lista = map.get(dataKey) || [];
      lista.push(item);
      map.set(dataKey, lista);
    }
    return map;
  }, [excecoesEscala]);

  const isSlotDisponivel = (date: Date) => {
    const minutos = date.getHours() * 60 + date.getMinutes();

    // Verificar exceções (horários extras) para a data específica
    const dataKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const faixasExcecao = excecoesPorData.get(dataKey) || [];
    if (faixasExcecao.some((faixa) => minutos >= faixa.inicio && minutos < faixa.fim)) {
      return true;
    }

    // Verificar escala regular
    const diaSemana = date.getDay();
    const faixas = escalaPorDia.get(diaSemana) || [];
    if (faixas.length === 0) return false;
    return faixas.some((faixa) => minutos >= faixa.inicio && minutos < faixa.fim);
  };

  const events = useMemo(() => {
    const agendamentosEvents = agendamentos.map((agendamento) => {
      const dataHora = new Date(agendamento.dataHora);
      const endTime = agendamento.dataHoraFim
        ? new Date(agendamento.dataHoraFim)
        : (() => { const e = new Date(dataHora); e.setMinutes(e.getMinutes() + 30); return e; })();

      const tipoNome = agendamento.tipoConsulta?.nome;
      const procedimentoNome = agendamento.procedimento?.nome;
      const detalhes = [tipoNome, procedimentoNome].filter(Boolean).join(" | ");
      const title = `${agendamento.paciente.nome}${detalhes ? ` - ${detalhes}` : ""}`;

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

    const bloqueiosEvents = bloqueios.flatMap((bloqueio) => {
      // Combinar data e hora para criar DateTime
      let dataInicio: Date;
      let dataFim: Date;

      if (bloqueio.dataInicio instanceof Date) {
        const dataStr = formatDateToInput(bloqueio.dataInicio);
        dataInicio = new Date(`${dataStr}T${bloqueio.horaInicio}:00`);
      } else {
        const dataStr = bloqueio.dataInicio.split("T")[0];
        dataInicio = new Date(`${dataStr}T${bloqueio.horaInicio}:00`);
      }

      if (bloqueio.dataFim instanceof Date) {
        const dataStr = formatDateToInput(bloqueio.dataFim);
        dataFim = new Date(`${dataStr}T${bloqueio.horaFim}:00`);
      } else {
        const dataStr = bloqueio.dataFim.split("T")[0];
        dataFim = new Date(`${dataStr}T${bloqueio.horaFim}:00`);
      }

      const title = bloqueio.observacoes ? `Bloqueio - ${bloqueio.observacoes}` : "Bloqueio";

      // Se o bloqueio for no mesmo dia, retornar evento unico
      const inicioDateStr = formatDateToInput(dataInicio);
      const fimDateStr = formatDateToInput(dataFim);

      if (inicioDateStr === fimDateStr) {
        return [{
          id: `bloqueio-${bloqueio.id}`,
          title,
          start: dataInicio,
          end: dataFim,
          resource: bloqueio,
          tipo: "bloqueio" as const,
        }];
      }

      // Bloqueio multi-dia: dividir em eventos por dia
      // Iterar por datas usando strings YYYY-MM-DD para evitar problemas de timezone
      const dayEvents: Array<{
        id: string;
        title: string;
        start: Date;
        end: Date;
        resource: BloqueioAgenda;
        tipo: "bloqueio";
      }> = [];

      const [iy, im, id] = inicioDateStr.split("-").map(Number);
      const [fy, fm, fd] = fimDateStr.split("-").map(Number);
      const startDate = new Date(iy, im - 1, id);
      const endDate = new Date(fy, fm - 1, fd);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const currentDateStr = `${yy}-${mm}-${dd}`;

        const dayStart = currentDateStr === inicioDateStr
          ? dataInicio
          : new Date(`${currentDateStr}T06:00:00`);
        const dayEnd = currentDateStr === fimDateStr
          ? dataFim
          : new Date(`${currentDateStr}T23:00:00`);

        dayEvents.push({
          id: `bloqueio-${bloqueio.id}-${currentDateStr}`,
          title,
          start: dayStart,
          end: dayEnd,
          resource: bloqueio,
          tipo: "bloqueio" as const,
        });
      }

      return dayEvents;
    });

    return [...agendamentosEvents, ...bloqueiosEvents];
  }, [agendamentos, bloqueios]);

  const eventStyleGetter = (event: any) => {
    if (event.tipo === "bloqueio") {
      return {
        className: "evento-bloqueio",
        style: {
          backgroundColor: "#000000",
          border: "none",
          borderLeft: "2px solid #1a1a1a",
          borderRadius: "4px",
          color: "white",
          padding: "2px 6px",
          opacity: 0.85,
          fontWeight: 500,
          fontSize: "12px",
          lineHeight: "1.25",
          cursor: "pointer",
        },
      };
    }

    const agendamento = event.resource as Agendamento;
    const tipoCor = agendamento.encaixe
      ? { bg: "#f97316", border: "#ea580c" }
      : getStatusColor(agendamento.status);

    return {
      style: {
        backgroundColor: tipoCor.bg,
        border: "none",
        borderLeft: `2px solid ${tipoCor.border}`,
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
    if (event.tipo === "bloqueio") {
      if (onBloqueioClick) {
        onBloqueioClick(event.resource);
      }
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
    <div className="flex flex-col w-full">
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
          .calendar-modern .rbc-month-row + .rbc-month-row {
            border-top: 1px solid var(--cal-line);
          }
          .calendar-modern .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid var(--cal-line);
          }
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
            border-bottom: 1px solid var(--cal-line-strong);
          }
          .calendar-modern .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--cal-line);
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
          /* Slot bloqueado (fora de escala) */
          .calendar-modern .rbc-time-slot.slot-bloqueado {
            background-color: rgba(17, 24, 39, 0.05) !important;
            cursor: not-allowed !important;
          }
          /* Evento de bloqueio (hachurado) */
          .evento-bloqueio .rbc-event-label {
            display: none !important;
          }
          .evento-bloqueio .rbc-event-content {
            position: sticky !important;
            top: 2px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .evento-bloqueio {
            background-image: repeating-linear-gradient(
              45deg,
              transparent,
              transparent 5px,
              rgba(255,255,255,0.06) 5px,
              rgba(255,255,255,0.06) 10px
            ) !important;
          }
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "640px" }}
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
          date={currentDate}
          onNavigate={handleNavigate}
          view={currentView}
          onView={handleViewChange}
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
            const cor = getStatusColorComEncaixe(status);
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
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "#000000" }}
            />
            <span className="text-[11px] text-muted-foreground">Bloqueio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

