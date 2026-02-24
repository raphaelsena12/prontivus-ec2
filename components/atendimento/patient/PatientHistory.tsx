"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FileImage,
  Calendar,
  ExternalLink,
  Download,
  Loader2,
  ClipboardList,
  Clock,
  Stethoscope,
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

function formatDateTime(dataHora: string | Date): string {
  const d = typeof dataHora === "string" ? new Date(dataHora) : dataHora;
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getEventDate(event: TimelineEvent): Date {
  if (event.type === "consulta") {
    return new Date(event.data.dataHora);
  } else {
    return event.data.data instanceof Date ? event.data.data : new Date(event.data.data);
  }
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

  // Criar timeline unificada com consultas e exames
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Adicionar consultas
    historicoConsultas.forEach((consulta) => {
      events.push({ type: "consulta", data: consulta });
    });

    // Adicionar exames anteriores (não da consulta atual)
    examesAnexados
      .filter((e) => !e.isFromCurrentConsulta)
      .forEach((exame) => {
        events.push({ type: "exame", data: exame });
      });

    // Ordenar por data (mais recente primeiro)
    events.sort((a, b) => {
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      return dateB.getTime() - dateA.getTime();
    });

    return events;
  }, [historicoConsultas, examesAnexados]);

  // Filtrar eventos baseado no filtro ativo
  const filteredEvents = useMemo(() => {
    if (activeFilter === "todos") return timelineEvents;
    if (activeFilter === "consultas") {
      return timelineEvents.filter((e) => e.type === "consulta");
    }
    if (activeFilter === "exames") {
      return timelineEvents.filter((e) => e.type === "exame");
    }
    if (activeFilter === "medicamentos") {
      return []; // Medicamentos ainda não implementados
    }
    return timelineEvents;
  }, [timelineEvents, activeFilter]);

  const totalEvents = historicoConsultas.length + examesAnexados.filter((e) => !e.isFromCurrentConsulta).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header colapsável */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-sm font-semibold text-slate-800">Histórico do Paciente</span>
          {!isExpanded && totalEvents > 0 && (
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 bg-slate-50">
              {totalEvents} evento{totalEvents !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <span className="text-xs text-[#1E40AF] font-medium">
          {isExpanded ? "Recolher" : "Expandir"}
        </span>
      </button>

      {/* Conteúdo colapsável */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="p-4">
            {/* Filtros */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {filterLabels.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeFilter === f
                      ? "bg-[#1E40AF] text-white border-[#1E40AF]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {filterDisplay[f]}
                </button>
              ))}
            </div>

            {loadingHistorico ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhum evento encontrado</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {filteredEvents.map((event) => {
                    if (event.type === "consulta") {
                      const consulta = event.data;
                      const isOpen = expandedConsultas.has(consulta.id);
                      return (
                        <div
                          key={`consulta-${consulta.id}`}
                          className="border border-slate-100 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => onToggleConsulta(consulta.id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Stethoscope className="w-4 h-4 text-[#1E40AF] flex-shrink-0" />
                              <span className="text-xs font-medium text-slate-800 whitespace-nowrap">
                                {formatDateTime(consulta.dataHora)}
                              </span>
                              <span className="text-xs text-slate-500 whitespace-nowrap">Consulta</span>
                              {consulta.tipoConsulta && (
                                <span className="text-xs text-slate-500 truncate">
                                  {consulta.tipoConsulta.nome}
                                </span>
                              )}
                              {consulta.prontuario?.diagnostico && (
                                <span className="text-xs text-slate-400 truncate">
                                  {consulta.prontuario.diagnostico}
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3 border-t border-slate-50 bg-slate-50/50">
                              {consulta.prontuario?.anamnese && (
                                <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                                  {consulta.prontuario.anamnese}
                                </p>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewDocumentos(consulta.id)}
                                className="h-6 px-2 text-xs gap-1 text-[#1E40AF] hover:bg-blue-50 mt-2"
                              >
                                <FileText className="w-3 h-3" />
                                Ver documentos
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Evento é um exame
                      const exame = event.data;
                      const exameDate = exame.data instanceof Date ? exame.data : new Date(exame.data);
                      return (
                        <div
                          key={`exame-${exame.id}`}
                          className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {exame.isImage ? (
                              <FileImage className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-slate-800 whitespace-nowrap">
                              {formatDateTime(exameDate)}
                            </span>
                            <span className="text-xs text-slate-500 whitespace-nowrap">Exame</span>
                            <span className="text-xs font-medium text-slate-800 truncate">
                              {exame.nome}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{exame.tipo}</span>
                            {isRecente(exameDate) && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 h-4 whitespace-nowrap">
                                Recente
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDownloadExame(exame.id, exame.s3Key)}
                            className="h-7 w-7 p-0 text-[#1E40AF] hover:bg-blue-50 flex-shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
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
