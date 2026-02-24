"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface VitalSign {
  label: string;
  value: string;
  unit: string;
}

interface MedicalSummary {
  panoramaGeral: string;
  condicoesAtivas: string[];
  pontosAtencao: string[];
  tendenciasClinicas: string[];
  orientacoesSugeridas: string[];
  nivelComplexidade: "baixo" | "moderado" | "alto";
}

interface PatientMedicalSummaryProps {
  paciente: {
    nome: string;
    idade: number | string;
    id: string;
  };
  alergias: string[];
  historicoConsultas: any[];
  medicamentosEmUso: any[];
  examesAnexados: any[];
  vitais: VitalSign[];
}

const COMPLEXITY_CONFIG = {
  baixo: {
    label: "Baixa Complexidade",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  moderado: {
    label: "Complexidade Moderada",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  alto: {
    label: "Alta Complexidade",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

export function PatientMedicalSummary({
  paciente,
  alergias,
  historicoConsultas,
  medicamentosEmUso,
  examesAnexados,
  vitais,
}: PatientMedicalSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/medico/resumo-paciente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente,
          alergias,
          historicoConsultas,
          medicamentosEmUso,
          examesAnexados,
          vitais,
        }),
      });
      if (!res.ok) throw new Error("Falha ao gerar resumo");
      const data: MedicalSummary = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    } finally {
      setIsGenerating(false);
    }
  }, [paciente, alergias, historicoConsultas, medicamentosEmUso, examesAnexados, vitais]);

  const handleToggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    // Gera automaticamente na primeira abertura
    if (next && !summary && !isGenerating) {
      generateSummary();
    }
  };

  const complexity = summary
    ? COMPLEXITY_CONFIG[summary.nivelComplexidade] ?? COMPLEXITY_CONFIG.moderado
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header — idêntico ao PatientHistory */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-sm font-semibold text-slate-800">Resumo Médico</span>
          {!isExpanded && (
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 bg-slate-50">
              IA
            </Badge>
          )}
          {!isExpanded && summary && complexity && (
            <Badge variant="outline" className={`text-xs ${complexity.color} border ${complexity.border} ${complexity.bg}`}>
              {complexity.label}
            </Badge>
          )}
        </div>
        <span className="text-xs text-[#1E40AF] font-medium">
          {isExpanded ? "Recolher" : "Expandir"}
        </span>
      </button>

      {/* Corpo colapsável */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* Loading */}
          {isGenerating && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span className="text-sm text-slate-500">
                  Analisando histórico, exames e dados clínicos...
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24 bg-slate-100" />
                    <Skeleton className="h-4 w-full bg-slate-100" />
                    <Skeleton className="h-4 w-4/5 bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && !isGenerating && (
            <div className="p-5">
              <div className="flex items-center gap-2 text-red-600 mb-3">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Não foi possível gerar o resumo
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{error}</p>
              <Button
                size="sm"
                onClick={generateSummary}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2 h-8 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Conteúdo */}
          {summary && !isGenerating && (
            <div className="p-5 space-y-5">
              {/* Panorama Geral */}
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                    Panorama Clínico
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {summary.panoramaGeral}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Condições Ativas */}
                {summary.condicoesAtivas?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        Condições Ativas
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.condicoesAtivas.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-600 leading-snug">
                            {c}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pontos de Atenção */}
                {summary.pontosAtencao?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        Pontos de Atenção
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.pontosAtencao.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          </div>
                          <span className="text-xs text-slate-600 leading-snug">
                            {p}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tendências Clínicas */}
                {summary.tendenciasClinicas?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        Tendências no Histórico
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.tendenciasClinicas.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <span className="text-xs text-slate-600 leading-snug">
                            {t}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Orientações Sugeridas */}
                {summary.orientacoesSugeridas?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        Orientações para esta Consulta
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.orientacoesSugeridas.map((o, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                          <span className="text-xs text-slate-600 leading-snug">
                            {o}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Brain className="w-3 h-3" />
                  <span className="text-[10px]">
                    Gerado por IA — revise antes de usar clinicamente
                  </span>
                </div>
                <button
                  onClick={generateSummary}
                  className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Atualizar
                </button>
              </div>
            </div>
          )}

          {/* Estado vazio (não gerado, sem erro) */}
          {!summary && !isGenerating && !error && (
            <div className="p-5 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                <Brain className="w-6 h-6 text-violet-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                Resumo ainda não gerado
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                A IA irá analisar histórico, exames, medicamentos e sinais
                vitais para criar um panorama clínico completo.
              </p>
              <Button
                size="sm"
                onClick={generateSummary}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2 h-8 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Resumo com IA
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
