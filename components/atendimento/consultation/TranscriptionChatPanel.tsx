"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Pause,
  Play,
  Square,
  Settings,
  Minus,
  Maximize2,
  Sparkles,
} from "lucide-react";

interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
  speakerLabel?: string;
}

interface TranscriptionChatPanelProps {
  isTranscribing: boolean;
  isPreparing?: boolean;
  isPaused: boolean;
  transcription: TranscriptionEntry[];
  sessionDuration: string;
  pauseTranscription: () => void;
  resumeTranscription: () => void;
  stopTranscription: () => void | Promise<void>;
  setTranscricaoFinalizada: (v: boolean) => void;
  setIsMicrophoneSelectorOpen: (v: boolean) => void;
  /** Se minimizado, o painel some e a TranscriptionBar (pill) assume. */
  minimized: boolean;
  setMinimized: (v: boolean) => void;
}

export function TranscriptionChatPanel({
  isTranscribing,
  isPreparing,
  isPaused,
  transcription,
  sessionDuration,
  pauseTranscription,
  resumeTranscription,
  stopTranscription,
  setTranscricaoFinalizada,
  setIsMicrophoneSelectorOpen,
  minimized,
  setMinimized,
}: TranscriptionChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll para a última mensagem quando chegar nova entrada,
  // mas só se o usuário não tiver rolado pra cima manualmente.
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcription, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(nearBottom);
  };

  // O painel aparece tanto enquanto prepara (tela cheia do overlay some em ~2s)
  // quanto durante a gravação. Assim em regravações o painel reabre imediatamente.
  if ((!isTranscribing && !isPreparing) || minimized) return null;

  const wordCount = transcription
    .map((e) => e.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);

  return (
    <div
      className="fixed bottom-4 right-4 h-[60vh] w-[420px] z-40 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300"
      aria-label="Transcrição ao vivo"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-t-2xl border-b transition-colors ${
          isPaused ? "bg-amber-50 border-amber-200" : "border-transparent"
        }`}
        style={
          isPaused
            ? undefined
            : { background: "linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%)" }
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <Mic className={`w-4 h-4 ${isPaused ? "text-amber-700" : "text-white"}`} />
            {!isPaused && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isPaused ? "text-amber-900" : "text-white"}`}>
              Transcrição ao vivo
            </p>
            <div className={`flex items-center gap-2 text-[11px] ${isPaused ? "text-amber-700" : "text-blue-100"}`}>
              <span className="tabular-nums">{sessionDuration}</span>
              <span>•</span>
              <span>{isPaused ? "Pausado" : "Gravando"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsMicrophoneSelectorOpen(true)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              isPaused
                ? "text-amber-700 hover:bg-amber-100"
                : "text-blue-100 hover:bg-white/15"
            }`}
            title="Configurar microfone"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMinimized(true)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              isPaused
                ? "text-amber-700 hover:bg-amber-100"
                : "text-blue-100 hover:bg-white/15"
            }`}
            title="Minimizar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Área de mensagens (chat) ───────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50"
      >
        {transcription.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="flex gap-1.5 mb-4">
              {[0, 150, 300].map((d) => (
                <div
                  key={d}
                  className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-600">Ouvindo…</p>
            <p className="text-xs text-slate-400 mt-1">
              Fale normalmente — a transcrição aparecerá aqui em tempo real.
            </p>
          </div>
        ) : (
          transcription.map((entry, idx) => (
            <MessageBubble
              key={idx}
              entry={entry}
              isLast={idx === transcription.length - 1}
            />
          ))
        )}
      </div>

      {/* ── Footer: status + controles ─────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-white rounded-b-2xl">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span>{isPaused ? "Pausado" : "Ouvindo…"}</span>
            <span className="text-slate-300">•</span>
            <span className="tabular-nums">{wordCount} palavras</span>
          </div>
          {!autoScroll && transcription.length > 0 && (
            <button
              onClick={() => {
                setAutoScroll(true);
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
              }}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Ir para o final ↓
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          {isPaused ? (
            <Button
              size="sm"
              onClick={resumeTranscription}
              className="flex-1 h-9 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold gap-1.5 rounded-xl border-0"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              Retomar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={pauseTranscription}
              className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold gap-1.5 rounded-xl border-0"
            >
              <Pause className="w-3.5 h-3.5" fill="currentColor" />
              Pausar
            </Button>
          )}
          <Button
            size="sm"
            onClick={async () => {
              await stopTranscription();
              setTranscricaoFinalizada(true);
            }}
            className="flex-1 h-9 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold gap-1.5 rounded-xl border-0"
          >
            <Square className="w-3.5 h-3.5" fill="currentColor" />
            Encerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  entry,
  isLast,
}: {
  entry: TranscriptionEntry;
  isLast: boolean;
}) {
  const shortTime = (() => {
    const parts = entry.time.split(":");
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return entry.time;
  })();

  return (
    <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[11px] font-semibold text-slate-700">IA</span>
          <span className="text-[10px] text-slate-400 tabular-nums">{shortTime}</span>
        </div>
        <div
          className={`inline-block max-w-full rounded-2xl rounded-tl-sm px-3 py-1.5 text-[12px] leading-snug shadow-sm ${
            entry.isPartial
              ? "bg-blue-50 text-slate-700 border border-blue-100"
              : "bg-white text-slate-800 border border-slate-200"
          }`}
        >
          <span className="whitespace-pre-wrap break-words">{entry.text}</span>
          {entry.isPartial && isLast && (
            <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
