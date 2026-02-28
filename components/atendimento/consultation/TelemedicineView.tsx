"use client";

import React, { useState } from "react";
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
  Copy,
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
  ExternalLink,
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
  handleProcessTranscription: () => Promise<void>;
  onOpenResumoClinico: () => void;
  onEncerrar: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  patientLink?: string;
}

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
}: TelemedicineViewProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const qualityConfig = {
    excellent: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Excelente" },
    good: { color: "text-yellow-400", dot: "bg-yellow-400", label: "Boa" },
    unstable: { color: "text-red-400", dot: "bg-red-400", label: "Instável" },
  };
  const quality = qualityConfig[connectionQuality as keyof typeof qualityConfig] ?? qualityConfig.excellent;

  const copyLink = () => {
    if (!patientLink) return;
    navigator.clipboard.writeText(patientLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const tabs: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "transcript", icon: Mic, label: "Trans." },
    { id: "ai", icon: Brain, label: "IA" },
    { id: "docs", icon: FileText, label: "Docs" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden shadow-2xl shadow-black/40">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-sm border-b border-white/5 shrink-0">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-xs">{initials}</span>
        </div>

        {/* Patient info */}
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

        {/* Timer */}
        <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5 shrink-0 border border-white/5">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-mono font-bold text-sm tabular-nums">{sessionDuration}</span>
        </div>

        {/* Connection quality */}
        <div className={`flex items-center gap-1.5 shrink-0 ${quality.color}`}>
          <Wifi className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{quality.label}</span>
        </div>

        {/* Copy patient link */}
        {patientLink && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium transition-all shrink-0"
          >
            {linkCopied ? (
              <><CheckCircle2 className="w-3.5 h-3.5" />Copiado!</>
            ) : (
              <><Link2 className="w-3.5 h-3.5" />Link do paciente</>
            )}
          </button>
        )}

        {/* Settings */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all shrink-0">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left column: Video + Controls ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Video area */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden">
            {/* Patient placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-pulse">
                <User className="w-12 h-12 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-base">{patient.name}</p>
                <p className="text-slate-500 text-sm mt-0.5">Aguardando paciente conectar...</p>
              </div>
            </div>

            {/* Remote video (patient) — covers placeholder */}
            {remoteVideoRef && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            )}

            {/* Quality badge — top left */}
            <div className="absolute top-3 left-3 z-20">
              <div className={`flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 ${quality.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${quality.dot}`} />
                <span className="text-xs font-semibold">{quality.label}</span>
              </div>
            </div>

            {/* Doctor PiP — bottom right */}
            <div className="absolute bottom-4 right-4 w-40 h-28 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/15 shadow-2xl z-20 group transition-transform hover:scale-105">
              {/* Placeholder when camera off */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{initials}</span>
                </div>
              </div>
              {/* Local video (doctor) */}
              {localVideoRef && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-1.5 inset-x-0 text-center z-10">
                <span className="text-white text-[10px] font-semibold drop-shadow-sm">Você</span>
              </div>
            </div>
          </div>

          {/* ── Controls bar ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-t border-white/5 shrink-0 min-h-0">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <ControlButton
                active={isMicOn}
                activeIcon={<Mic className="w-4 h-4" />}
                inactiveIcon={<MicOff className="w-4 h-4" />}
                label={isMicOn ? "Microfone" : "Mudo"}
                danger={!isMicOn}
                onClick={() => setIsMicOn(!isMicOn)}
              />
              <ControlButton
                active={isCameraOn}
                activeIcon={<Video className="w-4 h-4" />}
                inactiveIcon={<VideoOff className="w-4 h-4" />}
                label={isCameraOn ? "Câmera" : "Câmera off"}
                danger={!isCameraOn}
                onClick={() => setIsCameraOn(!isCameraOn)}
              />
              <ControlButton
                active={!isScreenSharing}
                activeIcon={<Monitor className="w-4 h-4" />}
                inactiveIcon={<Monitor className="w-4 h-4" />}
                label="Compartilhar"
                accent={isScreenSharing}
                onClick={() => setIsScreenSharing(!isScreenSharing)}
              />
              <ControlButton
                active
                activeIcon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                inactiveIcon={<Maximize2 className="w-4 h-4" />}
                label={isFullscreen ? "Sair tela cheia" : "Tela cheia"}
                onClick={() => setIsFullscreen(!isFullscreen)}
              />
            </div>

            {/* End call */}
            <button
              onClick={onEncerrar}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/30"
            >
              <Phone className="w-4 h-4 rotate-[135deg]" />
              Encerrar Consulta
            </button>
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────── */}
        <div className="w-72 bg-slate-900 border-l border-white/5 flex flex-col overflow-hidden shrink-0">

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content wrapper — fills remaining sidebar height */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* ── Chat tab ────────────────────────────────────────────────── */}
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
                          <p className={`text-[10px] mt-1 ${msg.sender === "doctor" ? "text-blue-200" : "text-slate-500"}`}>
                            {msg.time}
                          </p>
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
                    onClick={() => {
                      if (chatMessage.trim()) {
                        onSendMessage(chatMessage.trim());
                        setChatMessage("");
                      }
                    }}
                    className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Transcript tab ───────────────────────────────────────────── */}
          {activeTab === "transcript" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Controls */}
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
                      <Play className="w-2.5 h-2.5" fill="currentColor" />
                      Iniciar
                    </button>
                  ) : isPaused ? (
                    <>
                      <button
                        onClick={resumeTranscription}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 rounded-lg transition-colors"
                      >
                        <Play className="w-2.5 h-2.5" fill="currentColor" />
                        Retomar
                      </button>
                      <button
                        onClick={async () => { await stopTranscription(); setTimeout(handleProcessTranscription, 500); }}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Square className="w-2.5 h-2.5" fill="currentColor" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={pauseTranscription}
                        className="w-6 h-6 flex items-center justify-center text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Pause className="w-2.5 h-2.5" fill="currentColor" />
                      </button>
                      <button
                        onClick={async () => { await stopTranscription(); setTimeout(handleProcessTranscription, 500); }}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
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
                          entry.speaker === "Médico"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-700 text-slate-400"
                        }`}>
                          {entry.speaker}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">{entry.time}</span>
                        {entry.isPartial && <span className="text-[10px] text-blue-500">(digitando...)</span>}
                      </div>
                      <p className={`text-xs text-slate-300 leading-relaxed pl-2 border-l ${
                        entry.isPartial ? "border-blue-500/30 border-dashed opacity-60" : "border-blue-500/20"
                      }`}>
                        {entry.text}
                      </p>
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
            </div>
          )}

          {/* ── IA Clínica tab ───────────────────────────────────────────── */}
          {activeTab === "ai" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Info card */}
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-blue-400 font-semibold text-xs">IA Clínica — GPT-4o</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Analise a transcrição em tempo real para obter resumo clínico, hipóteses diagnósticas e sugestões de conduta.
                </p>
              </div>

              {/* Analyze button */}
              <button
                onClick={async () => {
                  setIsProcessingAi(true);
                  await handleProcessTranscription();
                  setIsProcessingAi(false);
                }}
                disabled={isProcessingAi || transcription.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                {isProcessingAi ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analisando transcrição...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analisar com IA
                  </>
                )}
              </button>

              {/* Prontuário link */}
              <button
                onClick={onOpenResumoClinico}
                className="w-full flex items-center justify-center gap-2 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium py-2.5 rounded-xl transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Abrir prontuário completo
              </button>

              {transcription.length === 0 && (
                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-500 text-xs">
                    Ative a transcrição na aba <span className="text-slate-400 font-semibold">Trans.</span> para habilitar a análise por IA.
                  </p>
                </div>
              )}

              {/* Vitals */}
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
                          {v.value}
                          <span className="text-slate-500 text-[10px] ml-0.5">{v.unit}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Documentos tab ───────────────────────────────────────────── */}
          {activeTab === "docs" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-3">Ações Rápidas</p>

              {([
                { icon: Pill, label: "Receita Médica", desc: "Prescrever medicamentos", color: "blue" },
                { icon: ClipboardList, label: "Pedido de Exame", desc: "Solicitar exames diagnósticos", color: "purple" },
                { icon: FilePlus, label: "Atestado Médico", desc: "Gerar atestado de saúde", color: "emerald" },
                { icon: Stethoscope, label: "Encaminhamento", desc: "Encaminhar para especialista", color: "amber" },
                { icon: FileText, label: "Prontuário", desc: "Abrir ficha completa do paciente", color: "slate" },
              ] as const).map((action, i) => {
                const Icon = action.icon;
                const colorMap = {
                  blue: "bg-blue-500/15 text-blue-400",
                  purple: "bg-purple-500/15 text-purple-400",
                  emerald: "bg-emerald-500/15 text-emerald-400",
                  amber: "bg-amber-500/15 text-amber-400",
                  slate: "bg-slate-700 text-slate-400",
                };
                return (
                  <button
                    key={i}
                    onClick={action.label === "Prontuário" ? onOpenResumoClinico : undefined}
                    className="w-full flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 rounded-xl p-3 text-left transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[action.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-semibold">{action.label}</p>
                      <p className="text-slate-500 text-[11px] truncate">{action.desc}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}

          </div>{/* end tab content wrapper */}
        </div>{/* end sidebar */}
      </div>{/* end body */}
    </div>
  );
}

// ─── ControlButton helper ─────────────────────────────────────────────────────

function ControlButton({
  active,
  activeIcon,
  inactiveIcon,
  label,
  danger,
  accent,
  onClick,
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  danger?: boolean;
  accent?: boolean;
  onClick: () => void;
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
