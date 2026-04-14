"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  FileText,
  FileImage,
  Calendar,
  ExternalLink,
  Loader2,
  Stethoscope,
  FlaskConical,
  Pill,
  History,
  Video,
} from "lucide-react";

interface HistoricoConsulta {
  id: string;
  dataHora: string;
  status: string;
  prontuario?: {
    diagnostico?: string | null;
    anamnese?: string | null;
  } | null;
  medico?: { nome: string } | null;
  tipoConsulta?: { nome: string } | null;
  documentos?: any[];
}

interface ExameAnexado {
  id: string;
  nome: string;
  tipo: string;
  s3Key: string;
  data: Date;
  isImage: boolean;
  isPdf: boolean;
  originalFileName?: string;
  consultaId?: string;
  consultaData?: Date | string | null;
  isFromCurrentConsulta?: boolean;
}

interface PatientHistoryProps {
  isExpanded: boolean;
  onToggle: () => void;
  historicoConsultas: HistoricoConsulta[];
  loadingHistorico: boolean;
  examesAnexados: ExameAnexado[];
  expandedConsultas: Set<string>;
  onToggleConsulta: (id: string) => void;
  onViewDocumentos: (consultaId: string) => void;
  onDownloadExame: (id: string, s3Key: string) => void;
  formatDate: (d: any) => string;
}

type FilterType = "todos" | "consultas" | "exames" | "medicamentos";

const filterLabels: FilterType[] = ["todos", "consultas", "exames", "medicamentos"];
const filterDisplay: Record<FilterType, string> = {
  todos: "Todos",
  consultas: "Consultas",
  exames: "Exames",
  medicamentos: "Medicamentos",
};

type TimelineEvent =
  | { type: "consulta"; data: HistoricoConsulta }
  | { type: "exame"; data: ExameAnexado };

function isRecente(data: Date | string): boolean {
  const d = new Date(data);
  return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
}

function formatDateBR(dataHora: string | Date): string {
  const d = typeof dataHora === "string" ? new Date(dataHora) : dataHora;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeBR(dataHora: string | Date): string {
  const d = typeof dataHora === "string" ? new Date(dataHora) : dataHora;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getEventDate(event: TimelineEvent): Date {
  if (event.type === "consulta") {
    return new Date(event.data.dataHora);
  } else {
    return event.data.data instanceof Date ? event.data.data : new Date(event.data.data);
  }
}

function getConsultaTypeIcon(tipoNome?: string) {
  const nome = (tipoNome || "").toLowerCase();
  if (nome.includes("tele")) return <Video className="w-3.5 h-3.5" />;
  return <Stethoscope className="w-3.5 h-3.5" />;
}

export function PatientHistory({
  isExpanded,
  onToggle,
  historicoConsultas,
  loadingHistorico,
  examesAnexados,
  expandedConsultas,
  onToggleConsulta,
  onViewDocumentos,
  onDownloadExame,
  formatDate,
}: PatientHistoryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    historicoConsultas.forEach((c) => events.push({ type: "consulta", data: c }));
    examesAnexados
      .filter((e) => !e.isFromCurrentConsulta)
      .forEach((e) => events.push({ type: "exame", data: e }));
    events.sort((a, b) => getEventDate(b).getTime() - getEventDate(a).getTime());
    return events;
  }, [historicoConsultas, examesAnexados]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "todos") return timelineEvents;
    if (activeFilter === "consultas") return timelineEvents.filter((e) => e.type === "consulta");
    if (activeFilter === "exames") return timelineEvents.filter((e) => e.type === "exame");
    return [];
  }, [timelineEvents, activeFilter]);

  const totalEvents = historicoConsultas.length + examesAnexados.filter((e) => !e.isFromCurrentConsulta).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-blue-600" />
          <span className="text-[13px] font-bold text-slate-800">Histórico do Paciente</span>
          {totalEvents > 0 && (
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {totalEvents}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* Filters */}
          <div className="px-5 pt-3 pb-1 flex gap-1.5">
            {filterLabels.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {filterDisplay[f]}
              </button>
            ))}
          </div>

          <div className="px-3 pb-3 pt-2">
            {loadingHistorico ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs text-slate-400">Carregando histórico...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Nenhum evento encontrado</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y divide-slate-100">
                  {filteredEvents.map((event) => {
                    if (event.type === "consulta") {
                      const consulta = event.data;
                      const isOpen = expandedConsultas.has(consulta.id);
                      const tipoNome = consulta.tipoConsulta?.nome || "";
                      return (
                        <div key={`c-${consulta.id}`}>
                          <button
                            onClick={() => onToggleConsulta(consulta.id)}
                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 text-left transition-colors"
                          >
                            <Stethoscope className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800">
                                  {tipoNome || "Consulta"}
                                </span>
                                {consulta.prontuario?.diagnostico && (
                                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                                    — {consulta.prontuario.diagnostico}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatDateBR(consulta.dataHora)} às {formatTimeBR(consulta.dataHora)}
                              </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                          {isOpen && (
                            <div className="mx-3 mb-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              {consulta.prontuario?.anamnese && (
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                                  {consulta.prontuario.anamnese}
                                </p>
                              )}
                              <button
                                onClick={() => onViewDocumentos(consulta.id)}
                                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Ver ficha de atendimento
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      const exame = event.data;
                      const exameDate = exame.data instanceof Date ? exame.data : new Date(exame.data);
                      const recente = isRecente(exameDate);
                      return (
                        <div
                          key={`e-${exame.id}`}
                          className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 transition-colors group"
                        >
                          {exame.isImage ? (
                            <FileImage className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-800 truncate">{exame.nome}</span>
                              {recente && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">
                                  Recente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">
                                {formatDateBR(exameDate)} às {formatTimeBR(exameDate)}
                              </span>
                              <span className="text-[11px] text-slate-300">·</span>
                              <span className="text-[11px] text-slate-400">{exame.tipo}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => onDownloadExame(exame.id, exame.s3Key)}
                            className="p-2 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Abrir exame"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
