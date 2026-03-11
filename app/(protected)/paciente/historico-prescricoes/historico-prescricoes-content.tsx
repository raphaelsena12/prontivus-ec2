"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Pill,
  Search,
  Stethoscope,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";

interface Prescricao {
  id: string;
  dataPrescricao: Date;
  medico: {
    usuario: {
      nome: string;
    };
  } | null;
  consulta: {
    id: string;
    dataHora: Date;
  } | null;
  medicamentos: Array<{
    id: string;
    medicamento: {
      nome: string;
    };
    dosagem: string | null;
    posologia: string | null;
  }>;
}

function PrescricaoCard({ prescricao }: { prescricao: Prescricao }) {
  const [expanded, setExpanded] = useState(false);
  const data = new Date(prescricao.dataPrescricao);

  return (
    <Card className="border hover:shadow-sm transition-all duration-150 overflow-hidden">
      <CardContent className="p-0">
        {/* Header Row */}
        <div className="flex items-stretch">
          {/* Date column */}
          <div className="flex flex-col items-center justify-center min-w-[72px] bg-gradient-to-b from-orange-500 to-amber-600 px-3 py-4 text-white">
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

          {/* Content */}
          <div className="flex flex-1 flex-col gap-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold text-foreground">
                    {prescricao.medico?.usuario.nome || "Médico não informado"}
                  </span>
                </div>
                {prescricao.consulta && (
                  <div className="flex items-center gap-1.5 pl-5">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Consulta em {formatDate(new Date(prescricao.consulta.dataHora))}
                    </span>
                  </div>
                )}
              </div>
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800 text-xs shrink-0"
              >
                <Package className="h-3 w-3 mr-1" />
                {prescricao.medicamentos.length} med.
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-dashed border-muted">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Pill className="h-3 w-3" />
                {prescricao.medicamentos.length > 0
                  ? prescricao.medicamentos
                      .slice(0, 2)
                      .map((m) => m.medicamento.nome)
                      .join(", ") +
                    (prescricao.medicamentos.length > 2
                      ? ` +${prescricao.medicamentos.length - 2}`
                      : "")
                  : "Sem medicamentos"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    Fechar <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Ver detalhes <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="border-t bg-muted/30 px-4 py-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-orange-500" />
              Medicamentos Prescritos
            </h4>
            <div className="flex flex-col gap-2">
              {prescricao.medicamentos.map((med, index) => (
                <div
                  key={med.id}
                  className="flex gap-3 rounded-lg border bg-background p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {med.medicamento.nome}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {med.dosagem && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Dose:</span>
                          {med.dosagem}
                        </span>
                      )}
                      {med.posologia && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {med.posologia}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoricoPrescricoesContent() {
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPrescricoes();
  }, []);

  const loadPrescricoes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/paciente/prescricoes`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      const data = await response.json();
      setPrescricoes(data.prescricoes || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar prescrições");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? prescricoes.filter((p) => {
        const s = search.toLowerCase();
        return (
          p.medico?.usuario.nome?.toLowerCase().includes(s) ||
          p.medicamentos.some((m) => m.medicamento.nome?.toLowerCase().includes(s))
        );
      })
    : prescricoes;

  return (
    <div className="@container/main flex flex-1 flex-col gap-0">
      <div className="px-6 lg:px-8 pt-6">
        <PageHeader
          icon={Pill}
          title="Histórico de Prescrições"
          subtitle={loading ? "Carregando..." : `${prescricoes.length} prescrição${prescricoes.length !== 1 ? "ões" : ""} registrada${prescricoes.length !== 1 ? "s" : ""}`}
        />
      </div>

      <div className="px-6 lg:px-8 pb-6 flex flex-col gap-5">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por médico, medicamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">Carregando prescrições...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Pill className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Nenhuma prescrição encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Tente uma busca diferente" : "Suas prescrições aparecerão aqui"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((prescricao) => (
              <PrescricaoCard key={prescricao.id} prescricao={prescricao} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Exibindo {filtered.length} de {prescricoes.length} prescrição{prescricoes.length !== 1 ? "ões" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
