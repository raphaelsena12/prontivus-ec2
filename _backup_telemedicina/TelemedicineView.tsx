"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Mic, MicOff,
  Video, VideoOff,
  Monitor,
  MessageSquare,
  Send,
  Maximize2, Minimize2,
  Settings,
  Phone,
  Play, Pause, Square,
  Sparkles,
  FileText,
  Brain,
  Activity, Heart, Thermometer, Wind,
  Link2,
  CheckCircle2,
  Wifi,
  Stethoscope,
  Pill,
  ClipboardList,
  FilePlus,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
}

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  time: string;
}

interface PatientInfo {
  name: string;
  age: number;
  bloodType: string;
}

interface VitalSign {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  iconColor: string;
}

interface AiSuggestions {
  anamnese: string;
  cidCodes: Array<{ code: string; description: string; score: number }>;
  exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

type SidebarTab = "chat" | "transcript" | "ai" | "docs";

interface TelemedicineViewProps {
  patient: PatientInfo;
  vitals: VitalSign[];
  sessionDuration: string;
  connectionQuality: string;
  isMicOn: boolean;
  setIsMicOn: (v: boolean) => void;
  isCameraOn: boolean;
  setIsCameraOn: (v: boolean) => void;
  isScreenSharing: boolean;
  setIsScreenSharing: (v: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  chatMessage: string;
  setChatMessage: (v: string) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTranscribing: boolean;
  isPaused: boolean;
  transcription: TranscriptionEntry[];
  startTranscription: () => Promise<void>;
  pauseTranscription: () => void;
  resumeTranscription: () => void;
  stopTranscription: () => void | Promise<void>;
  handleProcessTranscription: () => Promise<AiSuggestions | null | void>;
  onOpenResumoClinico: () => void;
  onEncerrar: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  patientLink?: string;
  onOpenDocumentType?: (type: string) => void;
  patientPresent?: boolean;
}

// ─── Document types config ─────────────────────────────────────────────────────

const DOC_TYPES = [
  { icon: Pill,          label: "Receita Médica",    desc: "Prescrever medicamentos",          color: "blue",    type: "receita-medica" },
  { icon: ClipboardList, label: "Pedido de Exame",   desc: "Solicitar exames diagnósticos",    color: "purple",  type: "pedido-exames" },
  { icon: FilePlus,      label: "Atestado Médico",   desc: "Gerar atestado de saúde",          color: "emerald", type: "atestado-afastamento" },
  { icon: Stethoscope,   label: "Encaminhamento",    desc: "Encaminhar para especialista",     color: "amber",   type: "guia-encaminhamento" },
  { icon: FileText,      label: "Prontuário",        desc: "Abrir ficha completa do paciente", color: "slate",   type: "prontuario" },
] as const;

const DOC_COLOR_MAP = {
  blue:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  purple:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  amber:   "bg-amber-500/15 text-amber-400 border-amber-500/20",
  slate:   "bg-slate-700 text-slate-400 border-slate-600",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TelemedicineView({
  patient,
  vitals,
  sessionDuration,
  connectionQuality,
  isMicOn,
  setIsMicOn,
  isCameraOn,
  setIsCameraOn,
  isScreenSharing,
  setIsScreenSharing,
  isFullscreen,
  setIsFullscreen,
  chatMessage,
  setChatMessage,
  chatMessages,
  onSendMessage,
  isTranscribing,
  isPaused,
  transcription,
  startTranscription,
  pauseTranscription,
  resumeTranscription,
  stopTranscription,
  handleProcessTranscription,
  onOpenResumoClinico,
  onEncerrar,
  localVideoRef,
  remoteVideoRef,
  patientLink,
  onOpenDocumentType,
  patientPresent = false,
}: TelemedicineViewProps) {
  const [activeTab, setActiveTab]       = useState<SidebarTab>("chat");
  const [linkCopied, setLinkCopied]     = useState(false);

  // IA results — processados em background, exibidos na aba IA
  const [aiSuggestions, setAiSuggestions]   = useState<AiSuggestions | null>(null);
  const [aiProcessing, setAiProcessing]     = useState(false);

  // Docs — picklist de seleção
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [generatedDocs, setGeneratedDocs] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Fullscreen sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [setIsFullscreen]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try { await containerRef.current?.requestFullscreen(); }
      catch { setIsFullscreen(true); }
    } else {
      try { await document.exitFullscreen(); }
      catch { setIsFullscreen(false); }
    }
  }, [setIsFullscreen]);

  // ─── Stop transcription → processa em background na aba IA ─────────────────
  const handleStopAndProcess = useCallback(async () => {
    await stopTranscription();
    setActiveTab("ai");
    setAiProcessing(true);
    setAiSuggestions(null);
    try {
      const result = await handleProcessTranscription();
      if (result) setAiSuggestions(result as AiSuggestions);
    } finally {
      setAiProcessing(false);
    }
  }, [stopTranscription, handleProcessTranscription]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const initials = patient.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const qualityConfig = {
    excellent: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Excelente" },
    good:      { color: "text-yellow-400",  dot: "bg-yellow-400",  label: "Boa" },
    unstable:  { color: "text-red-400",     dot: "bg-red-400",     label: "Instável" },
  };
  const quality = qualityConfig[connectionQuality as keyof typeof qualityConfig] ?? qualityConfig.excellent;

  const copyLink = () => {
    if (!patientLink) return;
    navigator.clipboard.writeText(patientLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const toggleDoc = (type: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const handleGenerateDoc = (type: string) => {
    if (type === "prontuario") { onOpenResumoClinico(); return; }
    onOpenDocumentType?.(type);
    setGeneratedDocs((prev) => new Set([...prev, type]));
  };

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: "chat",       label: "Chat" },
    { id: "transcript", label: "Transcrição" },
    { id: "ai",         label: "IA" },
    { id: "docs",       label: "Documentos" },
  ];

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 overflow-hidden shadow-2xl shadow-black/40 ${
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "h-full rounded-xl"
      }`}
    >

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-sm border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-xs">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-sm leading-none truncate">{patient.name}</h2>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0 shrink-0 leading-5">
              Em Consulta
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-slate-400 text-[11px]">{patient.age} anos · {patient.bloodType}</span>
            {vitals.map((v, i) => (
              <span key={i} className="text-[11px]">
                <span className={`font-semibold ${v.iconColor}`}>{v.label}</span>
                <span className="text-slate-500 ml-0.5">{v.value}{v.unit}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5 shrink-0 border border-white/5">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-bold text-sm tabular-nums">{sessionDuration}</span>
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 ${quality.color}`}>
          <Wifi className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{quality.label}</span>
        </div>
        {patientLink && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium transition-all shrink-0"
          >
            {linkCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5" />Copiado!</>
              : <><Link2 className="w-3.5 h-3.5" />Link do paciente</>
            }
          </button>
        )}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all shrink-0">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left: Video + Controls ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Video area */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-pulse">
                <User className="w-12 h-12 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-base">{patient.name}</p>
                <p className="text-slate-500 text-sm mt-0.5">Aguardando paciente conectar...</p>
              </div>
            </div>

            {remoteVideoRef && (
              <video ref={remoteVideoRef} autoPlay playsInline
                className="absolute inset-0 w-full h-full object-cover z-10" />
            )}

            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
              <div className={`flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 ${quality.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${quality.dot}`} />
                <span className="text-xs font-semibold">{quality.label}</span>
              </div>
              {/* Indicador de presença do paciente */}
              <div className={`flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                patientPresent
                  ? "border-emerald-500/40 text-emerald-400"
                  : "border-white/10 text-slate-400"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${patientPresent ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                {patientPresent ? "Paciente presente" : "Aguardando paciente"}
              </div>
            </div>

            {/* Doctor PiP */}
            <div className="absolute bottom-4 right-4 w-40 h-28 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/15 shadow-2xl z-20 group transition-transform hover:scale-105">
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{initials}</span>
                </div>
              </div>
              {localVideoRef && (
                <video ref={localVideoRef} autoPlay playsInline muted
                  className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute bottom-1.5 inset-x-0 text-center z-10">
                <span className="text-white text-[10px] font-semibold drop-shadow-sm">Você</span>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <ControlButton active={isMicOn} activeIcon={<Mic className="w-4 h-4" />} inactiveIcon={<MicOff className="w-4 h-4" />}
                label={isMicOn ? "Microfone" : "Mudo"} danger={!isMicOn} onClick={() => setIsMicOn(!isMicOn)} />
              <ControlButton active={isCameraOn} activeIcon={<Video className="w-4 h-4" />} inactiveIcon={<VideoOff className="w-4 h-4" />}
                label={isCameraOn ? "Câmera" : "Câmera off"} danger={!isCameraOn} onClick={() => setIsCameraOn(!isCameraOn)} />
              <ControlButton active={!isScreenSharing} activeIcon={<Monitor className="w-4 h-4" />} inactiveIcon={<Monitor className="w-4 h-4" />}
                label="Compartilhar" accent={isScreenSharing} onClick={() => setIsScreenSharing(!isScreenSharing)} />
              <ControlButton active activeIcon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                inactiveIcon={<Maximize2 className="w-4 h-4" />} label={isFullscreen ? "Sair tela cheia" : "Tela cheia"}
                onClick={handleToggleFullscreen} />
            </div>
            <button
              onClick={onEncerrar}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/30"
            >
              <Phone className="w-4 h-4 rotate-[135deg]" />
              Encerrar Consulta
            </button>
          </div>
        </div>

        {/* ── Right Sidebar — w-96 ──────────────────────────────────────── */}
        <div className="w-96 bg-slate-900 border-l border-white/5 flex flex-col overflow-hidden shrink-0">

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-[11px] font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {tab.label}
                {/* Badge na aba IA quando processando ou com resultado */}
                {tab.id === "ai" && (aiProcessing || aiSuggestions) && (
                  <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${aiProcessing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

            {/* ── Chat ──────────────────────────────────────────────────── */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full overflow-hidden">
                <ScrollArea className="flex-1 min-h-0 p-3">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-slate-600 text-xs font-medium">Nenhuma mensagem</p>
                      <p className="text-slate-700 text-xs mt-0.5">Escreva abaixo para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            msg.sender === "doctor"
                              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                              : "bg-slate-800 text-slate-200 border border-white/5"
                          }`}>
                            {msg.sender !== "doctor" && (
                              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Paciente</p>
                            )}
                            <p className="text-xs leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 ${msg.sender === "doctor" ? "text-blue-200" : "text-slate-500"}`}>{msg.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-3 border-t border-white/5 shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && chatMessage.trim()) {
                          onSendMessage(chatMessage.trim());
                          setChatMessage("");
                        }
                      }}
                      placeholder="Mensagem para o paciente..."
                      className="flex-1 bg-slate-800 text-white placeholder-slate-600 text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                      onClick={() => { if (chatMessage.trim()) { onSendMessage(chatMessage.trim()); setChatMessage(""); } }}
                      className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white transition-colors shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Transcrição ───────────────────────────────────────────── */}
            {activeTab === "transcript" && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    {isTranscribing ? (
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isPaused ? "text-amber-400" : "text-emerald-400"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                        {isPaused ? "Pausado" : "Ao vivo"}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">GPT-4o</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isTranscribing ? (
                      <button
                        onClick={startTranscription}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Play className="w-2.5 h-2.5" fill="currentColor" />Iniciar
                      </button>
                    ) : isPaused ? (
                      <>
                        <button onClick={resumeTranscription}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 rounded-lg transition-colors">
                          <Play className="w-2.5 h-2.5" fill="currentColor" />Retomar
                        </button>
                        <button onClick={handleStopAndProcess} title="Parar e analisar com IA"
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Square className="w-2.5 h-2.5" fill="currentColor" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={pauseTranscription}
                          className="w-6 h-6 flex items-center justify-center text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
                          <Pause className="w-2.5 h-2.5" fill="currentColor" />
                        </button>
                        <button onClick={handleStopAndProcess} title="Parar e analisar com IA"
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Square className="w-2.5 h-2.5" fill="currentColor" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 p-3">
                  {transcription.length === 0 && !isTranscribing && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Mic className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-slate-600 text-xs font-medium">Nenhuma transcrição</p>
                      <p className="text-slate-700 text-xs mt-0.5">Clique em Iniciar para começar</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {transcription.map((entry, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            entry.speaker === "Médico" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
                          }`}>{entry.speaker}</span>
                          <span className="text-[10px] text-slate-600 tabular-nums">{entry.time}</span>
                          {entry.isPartial && <span className="text-[10px] text-blue-500">(digitando...)</span>}
                        </div>
                        <p className={`text-xs text-slate-300 leading-relaxed pl-2 border-l ${
                          entry.isPartial ? "border-blue-500/30 border-dashed opacity-60" : "border-blue-500/20"
                        }`}>{entry.text}</p>
                      </div>
                    ))}
                    {isTranscribing && transcription.length === 0 && (
                      <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span className="text-xs">Transcrevendo...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Hint: parar transcrição envia para IA */}
                {isTranscribing && (
                  <div className="px-3 py-2 border-t border-white/5 shrink-0">
                    <p className="text-[10px] text-slate-600 text-center">
                      Ao parar <span className="text-blue-400 font-semibold">■</span>, a IA analisa a transcrição automaticamente
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── IA ────────────────────────────────────────────────────── */}
            {activeTab === "ai" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* Processing state */}
                {aiProcessing && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold">Analisando transcrição...</p>
                      <p className="text-slate-500 text-xs mt-1">GPT-4o processando em background</p>
                    </div>
                  </div>
                )}

                {/* No transcription yet + not processing */}
                {!aiProcessing && !aiSuggestions && transcription.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Inicie a transcrição e, ao parar, a IA analisará automaticamente e sugerirá CID, exames e prescrições.
                    </p>
                  </div>
                )}

                {/* Has transcription but not yet analyzed */}
                {!aiProcessing && !aiSuggestions && transcription.length > 0 && (
                  <>
                    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-slate-400 text-xs">
                        {transcription.length} entrada(s) transcrita(s).<br />
                        Pare a transcrição para analisar automaticamente.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        setAiProcessing(true);
                        setAiSuggestions(null);
                        try {
                          const r = await handleProcessTranscription();
                          if (r) setAiSuggestions(r as AiSuggestions);
                        } finally { setAiProcessing(false); }
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />Analisar agora
                    </button>
                  </>
                )}

                {/* AI Results */}
                {!aiProcessing && aiSuggestions && (
                  <>
                    {/* Anamnese */}
                    {aiSuggestions.anamnese && (
                      <AiSection title="Anamnese" color="blue">
                        <p className="text-xs text-slate-300 leading-relaxed">{aiSuggestions.anamnese}</p>
                      </AiSection>
                    )}

                    {/* CID */}
                    {aiSuggestions.cidCodes.length > 0 && (
                      <AiSection title="Hipóteses Diagnósticas (CID)" color="purple">
                        <div className="space-y-1.5">
                          {aiSuggestions.cidCodes.map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{c.code}</span>
                              <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>
                            </div>
                          ))}
                        </div>
                      </AiSection>
                    )}

                    {/* Exames */}
                    {aiSuggestions.exames.length > 0 && (
                      <AiSection title="Exames Sugeridos" color="emerald">
                        <div className="space-y-1.5">
                          {aiSuggestions.exames.map((e, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-slate-200 font-semibold">{e.nome}</p>
                                {e.justificativa && <p className="text-[11px] text-slate-500">{e.justificativa}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AiSection>
                    )}

                    {/* Prescrições */}
                    {aiSuggestions.prescricoes.length > 0 && (
                      <AiSection title="Prescrições Sugeridas" color="amber">
                        <div className="space-y-2">
                          {aiSuggestions.prescricoes.map((p, i) => (
                            <div key={i} className="bg-slate-900/50 rounded-lg p-2">
                              <p className="text-xs text-slate-200 font-semibold">{p.medicamento}</p>
                              <p className="text-[11px] text-slate-400">{p.dosagem} · {p.posologia}</p>
                              {p.duracao && <p className="text-[11px] text-slate-500">Qtd: {p.duracao}</p>}
                            </div>
                          ))}
                        </div>
                      </AiSection>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setActiveTab("docs"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        <FileText className="w-3 h-3" />Gerar documentos
                      </button>
                      <button
                        onClick={onOpenResumoClinico}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 text-slate-300 hover:bg-slate-800 text-xs py-2 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />Prontuário
                      </button>
                    </div>

                    {/* Re-analyze */}
                    <button
                      onClick={async () => {
                        setAiProcessing(true);
                        setAiSuggestions(null);
                        try {
                          const r = await handleProcessTranscription();
                          if (r) setAiSuggestions(r as AiSuggestions);
                        } finally { setAiProcessing(false); }
                      }}
                      className="w-full text-[11px] text-slate-600 hover:text-slate-400 py-1 transition-colors"
                    >
                      Reanalisar transcrição
                    </button>
                  </>
                )}

                {/* Vitals — sempre visíveis */}
                {vitals.length > 0 && (
                  <div>
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-2">Sinais Vitais</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {vitals.map((v, i) => {
                        const Icon = v.icon;
                        return (
                          <div key={i} className="bg-slate-800/60 border border-white/5 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Icon className={`w-3 h-3 ${v.iconColor}`} />
                              <span className={`text-[10px] font-bold ${v.iconColor}`}>{v.label}</span>
                            </div>
                            <p className="text-white text-sm font-bold leading-none">
                              {v.value}<span className="text-slate-500 text-[10px] ml-0.5">{v.unit}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Documentos — picklist ─────────────────────────────────── */}
            {activeTab === "docs" && (
              <div className="flex flex-col h-full overflow-hidden">
                <ScrollArea className="flex-1 min-h-0 p-3">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                    Selecione os documentos para gerar
                  </p>

                  <div className="space-y-2">
                    {DOC_TYPES.map((action) => {
                      const Icon = action.icon;
                      const isSelected  = selectedDocs.has(action.type);
                      const isGenerated = generatedDocs.has(action.type);
                      return (
                        <div
                          key={action.type}
                          className={`flex items-center gap-3 rounded-xl p-3 border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "bg-slate-800/50 border-white/5 hover:border-white/10 hover:bg-slate-800"
                          }`}
                          onClick={() => toggleDoc(action.type)}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-blue-400 bg-blue-500" : "border-slate-600"
                          }`}>
                            {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>

                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${DOC_COLOR_MAP[action.color]}`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-xs font-semibold">{action.label}</p>
                            <p className="text-slate-500 text-[11px] truncate">{action.desc}</p>
                          </div>

                          {/* Status */}
                          {isGenerated ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateDoc(action.type); }}
                              className="shrink-0 text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors"
                            >
                              Gerar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* IA suggestions quick-add */}
                  {aiSuggestions && (aiSuggestions.exames.length > 0 || aiSuggestions.prescricoes.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />Sugestões da IA
                      </p>
                      <div className="space-y-1">
                        {aiSuggestions.exames.length > 0 && (
                          <button
                            onClick={() => { toggleDoc("pedido-exames"); }}
                            className="w-full text-left text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
                          >
                            + {aiSuggestions.exames.length} exame(s) sugerido(s) → Pedido de Exame
                          </button>
                        )}
                        {aiSuggestions.prescricoes.length > 0 && (
                          <button
                            onClick={() => { toggleDoc("receita-medica"); }}
                            className="w-full text-left text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
                          >
                            + {aiSuggestions.prescricoes.length} prescrição(ões) sugerida(s) → Receita Médica
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Footer: gerar selecionados / enviar ao paciente */}
                {selectedDocs.size > 0 && (
                  <div className="p-3 border-t border-white/5 shrink-0 space-y-2">
                    <p className="text-[11px] text-slate-500 text-center">
                      {selectedDocs.size} documento(s) selecionado(s)
                    </p>
                    <button
                      onClick={() => {
                        // Abre o dialog de cada doc selecionado (um por vez — o médico gera individualmente)
                        const first = [...selectedDocs].find((t) => !generatedDocs.has(t));
                        if (first) handleGenerateDoc(first);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Gerar próximo documento
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>{/* end tab content */}
        </div>{/* end sidebar */}
      </div>{/* end body */}
    </div>
  );
}

// ─── AiSection helper ─────────────────────────────────────────────────────────

function AiSection({ title, color, children }: { title: string; color: "blue" | "purple" | "emerald" | "amber"; children: React.ReactNode }) {
  const colorMap = {
    blue:    "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400",
    purple:  "from-purple-500/10 to-violet-500/10 border-purple-500/20 text-purple-400",
    emerald: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400",
    amber:   "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-3 space-y-2`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${colorMap[color].split(" ").pop()}`}>{title}</p>
      {children}
    </div>
  );
}

// ─── ControlButton helper ─────────────────────────────────────────────────────

function ControlButton({
  active, activeIcon, inactiveIcon, label, danger, accent, onClick,
}: {
  active: boolean; activeIcon: React.ReactNode; inactiveIcon: React.ReactNode;
  label: string; danger?: boolean; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
        danger
          ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
          : accent
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-white/5"
      }`}
    >
      {active ? activeIcon : inactiveIcon}
      <span className="hidden lg:inline leading-none">{label}</span>
    </button>
  );
}
