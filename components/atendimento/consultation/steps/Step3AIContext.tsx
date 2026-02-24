"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Lock, FileImage } from "lucide-react";

interface ExameAnexado {
  id: string;
  nome: string;
  isFromCurrentConsulta?: boolean;
}

interface Step3AIContextProps {
  examesAnexados: ExameAnexado[];
  selectedExams: Set<string>;
  setSelectedExams: (s: Set<string>) => void;
  historicoConsultas: any[];
  medicamentosEmUso: any[];
  isProcessing: boolean;
  onGenerateSuggestions: () => Promise<void>;
}

interface ContextItem {
  id: string;
  label: string;
  required: boolean;
  detail?: string;
}

export function Step3AIContext({
  examesAnexados,
  selectedExams,
  setSelectedExams,
  historicoConsultas,
  medicamentosEmUso,
  isProcessing,
  onGenerateSuggestions,
}: Step3AIContextProps) {
  const currentExams = examesAnexados.filter((e) => e.isFromCurrentConsulta);

  const [extras, setExtras] = useState({
    historico: false,
    examesAnteriores: false,
    medicamentos: false,
  });

  const toggleExtra = (key: keyof typeof extras) => {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const contextItems: ContextItem[] = [
    {
      id: "anamnese",
      label: "Anamnese desta consulta",
      required: true,
    },
    {
      id: "alergias",
      label: "Alergias registradas",
      required: true,
    },
    {
      id: "exames",
      label: "Exames desta consulta",
      required: false,
      detail: currentExams.length > 0 ? `${currentExams.length} arquivo(s) anexado(s)` : undefined,
    },
    {
      id: "historico",
      label: "Histórico de consultas anteriores",
      required: false,
      detail: historicoConsultas.length > 0 ? `${historicoConsultas.length} consulta(s)` : undefined,
    },
    {
      id: "examesAnteriores",
      label: "Exames laboratoriais anteriores",
      required: false,
    },
    {
      id: "medicamentos",
      label: "Medicamentos em uso",
      required: false,
      detail: medicamentosEmUso.length > 0 ? `${medicamentosEmUso.length} medicamento(s)` : undefined,
    },
  ];

  const isExtraChecked = (id: string) => {
    if (id === "historico") return extras.historico;
    if (id === "examesAnteriores") return extras.examesAnteriores;
    if (id === "medicamentos") return extras.medicamentos;
    return true;
  };

  const toggleItem = (id: string) => {
    if (id === "anamnese" || id === "alergias") return; // obrigatórios
    if (id === "historico") return toggleExtra("historico");
    if (id === "examesAnteriores") return toggleExtra("examesAnteriores");
    if (id === "medicamentos") return toggleExtra("medicamentos");
    // Exames da consulta
    const next = new Set(selectedExams);
    if (id === "exames") {
      // toggle todos os exames atuais
      if (currentExams.every((e) => next.has(e.id))) {
        currentExams.forEach((e) => next.delete(e.id));
      } else {
        currentExams.forEach((e) => next.add(e.id));
      }
      setSelectedExams(next);
    }
  };

  const examesChecked =
    currentExams.length > 0 && currentExams.every((e) => selectedExams.has(e.id));

  const getChecked = (id: string): boolean => {
    if (id === "anamnese" || id === "alergias") return true;
    if (id === "exames") return examesChecked || currentExams.some((e) => selectedExams.has(e.id));
    return isExtraChecked(id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1E40AF]" />
          <span className="text-sm font-semibold text-slate-800">
            Selecione os dados que a IA deve considerar
          </span>
        </div>

        <div className="p-5 space-y-3">
          {contextItems.map((item) => {
            const checked = getChecked(item.id);
            const isRequired = item.required;
            const hasDetail = !!item.detail;
            const noData =
              item.id === "exames" && currentExams.length === 0;

            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  isRequired
                    ? "bg-[var(--clinical-cobalt-light)] border-[var(--clinical-cobalt-border)] cursor-default"
                    : checked
                    ? "bg-[var(--clinical-cobalt-light)] border-[var(--clinical-cobalt-border)]"
                    : "bg-white border-slate-200 hover:border-slate-300"
                } ${noData ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !isRequired && !noData && toggleItem(item.id)}
              >
                {/* Custom checkbox */}
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked
                      ? "bg-[#1E40AF] border-[#1E40AF]"
                      : "border-slate-300"
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                      <polyline
                        points="1.5,5 4,7.5 8.5,2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        checked ? "text-[#1E40AF]" : "text-slate-700"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isRequired && (
                      <Lock className="w-3 h-3 text-[#1E40AF] opacity-60" />
                    )}
                  </div>
                  {hasDetail && (
                    <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
                  )}
                </div>

                {isRequired && (
                  <span className="text-xs text-[#1E40AF] opacity-70 flex-shrink-0">
                    obrigatório
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-center">
          <Button
            onClick={onGenerateSuggestions}
            disabled={isProcessing}
            className="h-10 px-8 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-md shadow-blue-200"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando sugestões clínicas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analisar com IA
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
