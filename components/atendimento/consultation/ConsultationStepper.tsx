"use client";

import React from "react";
import { Check } from "lucide-react";

interface ConsultationStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: Set<number>;
  onNavigate: (step: 1 | 2 | 3 | 4 | 5) => void;
}

const STEPS = [
  { id: 1, label: "Transcrição" },
  { id: 2, label: "Anamnese" },
  { id: 3, label: "Contexto IA" },
  { id: 4, label: "Sugestões" },
  { id: 5, label: "Documentos" },
] as const;

export function ConsultationStepper({
  currentStep,
  completedSteps,
  onNavigate,
}: ConsultationStepperProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between relative">
        {/* Linha conectora de fundo */}
        <div
          className="absolute top-4 left-6 right-6 h-px bg-slate-200"
          style={{ zIndex: 0 }}
        />
        {/* Linha conectora de progresso */}
        <div
          className="absolute top-4 left-6 h-px bg-[#1E40AF] transition-all duration-500"
          style={{
            zIndex: 0,
            width: `calc(${((currentStep - 1) / 4) * 100}% - 3rem + ${(currentStep - 1) * 0.5}rem)`,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && !isCurrent;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <button
                onClick={() => isClickable && onNavigate(step.id as 1 | 2 | 3 | 4 | 5)}
                disabled={!isClickable}
                title={isClickable ? `Ir para ${step.label}` : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${
                    isCompleted
                      ? "bg-[#1E40AF] border-[#1E40AF] text-white " +
                        (isClickable ? "cursor-pointer hover:bg-[#1e3a8a]" : "")
                      : isCurrent
                      ? "bg-[#1E40AF] border-[#1E40AF] text-white shadow-md shadow-blue-200"
                      : "bg-white border-slate-300 text-slate-400 cursor-default"
                  }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>

              <span
                className={`text-xs whitespace-nowrap select-none ${
                  isCurrent
                    ? "text-[#1E40AF] font-bold"
                    : isCompleted
                    ? "text-slate-600 font-medium"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
