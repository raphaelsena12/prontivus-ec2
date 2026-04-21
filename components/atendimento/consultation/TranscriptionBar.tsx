"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square, Settings, AlertTriangle, Loader2, Maximize2 } from "lucide-react";

interface TranscriptionBarProps {
  isTranscribing: boolean;
  isPreparing?: boolean;
  isPaused: boolean;
  transcricaoFinalizada: boolean;
  hasAnamnese: boolean;
  isProcessing?: boolean;
  stoppedUnexpectedly?: boolean;
  sessionDuration: string;
  pauseTranscription: () => void;
  resumeTranscription: () => void;
  stopTranscription: () => void | Promise<void>;
  setTranscricaoFinalizada: (v: boolean) => void;
  setIsMicrophoneSelectorOpen: (v: boolean) => void;
  onProcessAndAdvance: () => Promise<void>;
  startTranscription?: () => Promise<void>;
  /** Quando true, o painel de chat está minimizado — a pill exibe botão para expandir. */
  chatMinimized?: boolean;
  onExpandChat?: () => void;
}

export function TranscriptionBar({
  isTranscribing,
  isPreparing,
  isPaused,
  transcricaoFinalizada,
  hasAnamnese,
  isProcessing,
  stoppedUnexpectedly,
  sessionDuration,
  pauseTranscription,
  resumeTranscription,
  stopTranscription,
  setTranscricaoFinalizada,
  setIsMicrophoneSelectorOpen,
  startTranscription,
  chatMinimized,
  onExpandChat,
}: TranscriptionBarProps) {
  // Mostrar alerta de parada inesperada (mesmo sem estar gravando)
  if (stoppedUnexpectedly && !isTranscribing && !transcricaoFinalizada) {
    return (
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-3 rounded-2xl shadow-2xl px-4 py-2.5 bg-red-900">
          <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
          <span className="text-sm font-medium text-red-100 whitespace-nowrap">
            Transcrição interrompida — clique para retomar
          </span>
          {startTranscription && (
            <Button
              size="sm"
              onClick={startTranscription}
              className="h-7 px-3 bg-red-500 hover:bg-red-400 text-white text-xs gap-1.5 rounded-xl border-0"
            >
              <Play className="w-3 h-3" fill="currentColor" />
              Retomar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Estado "preparando" — overlay fullscreen bloqueante.
  // Impede interação enquanto getUserMedia + token + handshake do WS são resolvidos
  // (tipicamente 1-3s). Deixa claro que o sistema está ativo, não travado.
  if (isPreparing && !isTranscribing && !isProcessing) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-5 px-8 py-7 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl max-w-sm mx-4">
          {/* Ícone com halo pulsante */}
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-base font-semibold text-white mb-1">
              Preparando transcrição
            </p>
            <p className="text-sm text-slate-400">
              Acessando microfone e conectando ao servidor de IA…
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Isso leva poucos segundos</span>
          </div>
        </div>
      </div>
    );
  }

  // Não mostrar a barra quando estiver processando (modal já está sendo exibido).
  // Também esconder quando o painel de chat está aberto — só aparece se chat minimizado.
  const isVisible =
    isTranscribing &&
    !isProcessing &&
    !(transcricaoFinalizada && !hasAnamnese) &&
    chatMinimized !== false;
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
        <div className="relative">
          <Mic className={`w-4 h-4 ${isPaused ? "text-amber-400" : "text-white"}`} />
          {!isPaused && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>

        {/* Timer */}
        <span className="text-sm text-slate-300 tabular-nums">{sessionDuration}</span>

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

        {/* Expandir painel de chat (se minimizado) */}
        {onExpandChat && (
          <button
            onClick={onExpandChat}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-lg"
            title="Abrir painel de transcrição"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

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
