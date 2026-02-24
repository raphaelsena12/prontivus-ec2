"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Play,
  Pause,
  Square,
  Settings,
  Info,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
}

interface Step1TranscriptionProps {
  isTranscribing: boolean;
  isPaused: boolean;
  transcription: TranscriptionEntry[];
  sessionDuration: string;
  transcricaoFinalizada: boolean;
  editedTranscription?: string;
  setEditedTranscription?: (v: string) => void;
  startTranscription: () => Promise<void>;
  pauseTranscription: () => void;
  resumeTranscription: () => void;
  stopTranscription: () => void | Promise<void>;
  setTranscricaoFinalizada: (v: boolean) => void;
  setIsMicrophoneSelectorOpen: (v: boolean) => void;
  onProcessAndAdvance: () => Promise<void>;
}

function formatTranscriptionTime(timeStr: string): string {
  const parts = timeStr.split(":");
  const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export function Step1Transcription({
  isTranscribing,
  isPaused,
  transcription,
  sessionDuration,
  transcricaoFinalizada,
  startTranscription,
  pauseTranscription,
  resumeTranscription,
  stopTranscription,
  setTranscricaoFinalizada,
  setIsMicrophoneSelectorOpen,
  onProcessAndAdvance,
}: Step1TranscriptionProps) {
  const hasTranscription = transcription.length > 0;

  return (
    <div className="space-y-4">
      {/* Card principal de transcrição */}
      <div
        className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
          isTranscribing && !isPaused ? "animate-border-pulse border-[#1E40AF]" : "border-slate-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isTranscribing ? "bg-[#1E40AF]" : "bg-slate-800"
              }`}
            >
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Transcrição da Consulta</p>
              <p className="text-xs text-slate-400">
                {isTranscribing
                  ? "Transcrevendo em tempo real..."
                  : hasTranscription
                  ? "Revise e edite a transcrição antes de prosseguir"
                  : "Inicie quando o paciente começar a relatar"}
              </p>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {!isTranscribing && !transcricaoFinalizada && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <Sparkles className="w-3 h-3 text-blue-500" />
                Análise: OpenAI GPT
              </div>
            )}

            {isTranscribing && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  isPaused
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {isPaused ? "Pausado" : "Gravando"}
              </div>
            )}

            {isTranscribing && (
              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                {sessionDuration}
              </span>
            )}

            {!isTranscribing ? (
              <Button
                onClick={startTranscription}
                size="sm"
                className="h-8 px-4 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white text-xs gap-2"
              >
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                Iniciar Gravação
              </Button>
            ) : isPaused ? (
              <>
                <Button
                  onClick={resumeTranscription}
                  size="sm"
                  className="h-8 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  Retomar
                </Button>
                <Button
                  onClick={async () => {
                    await stopTranscription();
                    setTranscricaoFinalizada(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5"
                >
                  <Square className="w-3 h-3" fill="currentColor" />
                  Finalizar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={pauseTranscription}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-slate-300 text-slate-600 hover:bg-slate-50 text-xs gap-1.5"
                >
                  <Pause className="w-3 h-3" fill="currentColor" />
                  Pausar
                </Button>
                <Button
                  onClick={async () => {
                    await stopTranscription();
                    setTranscricaoFinalizada(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5"
                >
                  <Square className="w-3 h-3" fill="currentColor" />
                  Finalizar
                </Button>
              </>
            )}

            <Button
              onClick={() => setIsMicrophoneSelectorOpen(true)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Configurar microfone"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Área de transcrição */}
        <ScrollArea
          className={`transition-all ${
            isTranscribing || hasTranscription ? "h-72" : "h-44"
          }`}
        >
          <div className="p-5 space-y-3">
            {!hasTranscription && !isTranscribing && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">Pronto para iniciar a consulta</p>
                <p className="text-xs text-slate-400 mt-1">
                  Clique em "Iniciar Gravação" para transcrever a conversa
                </p>
              </div>
            )}

            {isTranscribing && !hasTranscription && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-10">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="w-2 h-2 bg-slate-800 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
                <span className="ml-2">Ouvindo...</span>
              </div>
            )}

            {transcription.map((entry, idx) => {
              const parts = entry.time.split(":");
              const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
              return (
                <div key={idx} className="flex gap-3 group">
                  <span className="text-slate-400 font-mono text-xs mt-0.5 flex-shrink-0 w-16 text-right">
                    {formatTranscriptionTime(entry.time)}
                  </span>
                  <div className="flex-1 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 group-hover:bg-slate-100 transition-colors">
                    {entry.text}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Aviso e botão de avanço — só aparecem após finalizar */}
      {transcricaoFinalizada && hasTranscription && (
        <div className="bg-[var(--clinical-cobalt-light)] border border-[var(--clinical-cobalt-border)] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#1E40AF] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1E40AF]">
                Transcrição encerrada — revise antes de prosseguir
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Você pode editar qualquer trecho diretamente na área acima.
              </p>
            </div>
            <Button
              onClick={onProcessAndAdvance}
              size="sm"
              className="h-8 px-4 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white text-xs gap-2 flex-shrink-0"
            >
              Processar e Gerar Anamnese
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
