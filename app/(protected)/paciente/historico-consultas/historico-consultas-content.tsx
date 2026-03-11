"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Stethoscope, Clock, CalendarDays, DollarSign, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";

interface Consulta {
  id: string;
  dataHora: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  status: string;
  valorCobrado: number | string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; dot: string }> = {
  AGENDADA: { label: "Agendada", variant: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", dot: "bg-blue-500" },
  CONFIRMADA: { label: "Confirmada", variant: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", dot: "bg-green-500" },
  CANCELADA: { label: "Cancelada", variant: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", dot: "bg-red-500" },
  REALIZADA: { label: "Realizada", variant: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", dot: "bg-purple-500" },
  FALTA: { label: "Falta", variant: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", dot: "bg-orange-500" },
  EM_ATENDIMENTO: { label: "Em Atendimento", variant: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse", dot: "bg-amber-500 animate-pulse" },
  CONCLUIDA: { label: "Concluída", variant: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.variant}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function HistoricoConsultasContent() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConsultas();
  }, []);

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/paciente/consultas`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      const data = await response.json();
      setConsultas(data.consultas || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar consultas");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? consultas.filter((c) => {
        const s = search.toLowerCase();
        return (
          c.medico?.usuario.nome?.toLowerCase().includes(s) ||
          c.tipoConsulta?.nome?.toLowerCase().includes(s) ||
          c.status.toLowerCase().includes(s)
        );
      })
    : consultas;

  return (
    <div className="@container/main flex flex-1 flex-col gap-0">
      <div className="px-6 lg:px-8 pt-6">
        <PageHeader
          icon={History}
          title="Histórico de Consultas"
          subtitle={loading ? "Carregando..." : `${consultas.length} consulta${consultas.length !== 1 ? "s" : ""} registrada${consultas.length !== 1 ? "s" : ""}`}
        />
      </div>

      <div className="px-6 lg:px-8 pb-6 flex flex-col gap-5">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por médico, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">Carregando consultas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Nenhuma consulta encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Tente uma busca diferente" : "Suas consultas aparecerão aqui"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((consulta) => {
              const data = new Date(consulta.dataHora);
              const isPast = data < new Date();
              return (
                <Card
                  key={consulta.id}
                  className="border hover:shadow-sm transition-all duration-150 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Date column */}
                      <div className="flex flex-col items-center justify-center min-w-[72px] bg-gradient-to-b from-violet-500 to-purple-600 px-3 py-4 text-white">
                        <span className="text-lg font-bold leading-none">
                          {data.getDate().toString().padStart(2, "0")}
                        </span>
                        <span className="text-[10px] font-medium uppercase opacity-90 mt-0.5">
                          {data.toLocaleString("pt-BR", { month: "short" })}
                        </span>
                        <span className="text-[10px] opacity-75 mt-0.5">
                          {data.getFullYear()}
                        </span>
                      </div>

                      {/* Main content */}
                      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-semibold text-foreground">
                                {consulta.medico?.usuario.nome || "Médico não informado"}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground pl-5">
                              {consulta.tipoConsulta?.nome || "Tipo não informado"}
                            </span>
                          </div>
                          <StatusBadge status={consulta.status} />
                        </div>

                        <div className="flex items-center gap-4 pt-1 border-t border-dashed border-muted">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(data)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {isPast ? "Realizada" : "Agendada"}
                          </div>
                          {consulta.valorCobrado && (
                            <div className="flex items-center gap-1 text-xs font-medium text-foreground ml-auto">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              {formatCurrency(Number(consulta.valorCobrado))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center pr-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Exibindo {filtered.length} de {consultas.length} consulta{consultas.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
