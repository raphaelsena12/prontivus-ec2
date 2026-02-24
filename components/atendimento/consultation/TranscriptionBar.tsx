"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square, Settings, Loader2 } from "lucide-react";

interface TranscriptionBarProps {
  isTranscribing: boolean;
  isPaused: boolean;
  transcricaoFinalizada: boolean;
  hasAnamnese: boolean;
  isProcessing?: boolean; // gerando anamnese automaticamente
  sessionDuration: string;
  pauseTranscription: () => void;
  resumeTranscription: () => void;
  stopTranscription: () => void | Promise<void>;
  setTranscricaoFinalizada: (v: boolean) => void;
  setIsMicrophoneSelectorOpen: (v: boolean) => void;
  onProcessAndAdvance: () => Promise<void>;
}

export function TranscriptionBar({
  isTranscribing,
  isPaused,
  transcricaoFinalizada,
  hasAnamnese,
  isProcessing,
  sessionDuration,
  pauseTranscription,
  resumeTranscription,
  stopTranscription,
  setTranscricaoFinalizada,
  setIsMicrophoneSelectorOpen,
}: TranscriptionBarProps) {
  // Não mostrar a barra quando estiver processando (modal já está sendo exibido)
  const isVisible = isTranscribing && !isProcessing && !(transcricaoFinalizada && !hasAnamnese);
  if (!isVisible) return null;

  // ── Estado: gravando ou pausado ──
  return (
    <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className={`flex items-center gap-3 rounded-2xl shadow-2xl px-4 py-2.5 transition-colors ${
          isPaused ? "bg-amber-950" : "bg-slate-900"
        }`}
      >
        {/* Indicador de estado */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mic className={`w-4 h-4 ${isPaused ? "text-amber-400" : "text-white"}`} />
            {!isPaused && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <span
            className={`text-sm font-medium whitespace-nowrap ${
              isPaused ? "text-amber-200" : "text-white"
            }`}
          >
            {isPaused ? "Pausado" : "Gravando"}
          </span>
        </div>

        {/* Timer */}
        <span className="font-mono text-sm text-slate-300 tabular-nums">{sessionDuration}</span>

        <div className={`w-px h-4 ${isPaused ? "bg-amber-800" : "bg-slate-700"}`} />

        {/* Controles */}
        {isPaused ? (
          <Button
            size="sm"
            onClick={resumeTranscription}
            className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold gap-1.5 rounded-xl border-0"
          >
            <Play className="w-3 h-3" fill="currentColor" />
            Retomar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={pauseTranscription}
            className="h-7 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs gap-1.5 rounded-xl border-0"
          >
            <Pause className="w-3 h-3" fill="currentColor" />
            Pausar
          </Button>
        )}

        <Button
          size="sm"
          onClick={async () => {
            await stopTranscription();
            setTranscricaoFinalizada(true);
          }}
          className="h-7 px-3 bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5 rounded-xl border-0"
        >
          <Square className="w-3 h-3" fill="currentColor" />
          Encerrar
        </Button>

        {/* Config microfone */}
        <button
          onClick={() => setIsMicrophoneSelectorOpen(true)}
          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors rounded-lg"
          title="Configurar microfone"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
