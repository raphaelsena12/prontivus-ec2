"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Send,
  Maximize2,
  Minimize2,
  Settings,
  Camera,
  Share2,
  FileText,
  Play,
  Pause,
  Square,
  Sparkles,
} from "lucide-react";

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
}

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
  isChatOpen,
  setIsChatOpen,
  chatMessage,
  setChatMessage,
  chatMessages,
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
}: TelemedicineViewProps) {
  return (
    <div className="grid grid-cols-12 gap-4 animate-in fade-in duration-500">
      {/* Main Video Area */}
      <div className="col-span-8 space-y-3">
        {/* Patient Video - Large */}
        <Card className="border-slate-200 shadow-2xl shadow-emerald-500/20 overflow-hidden relative group">
          {/* Video Container */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 aspect-video flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10" />

            {/* Patient Placeholder */}
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-pulse">
                <User className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">{patient.name}</h3>
              <Badge className="bg-emerald-500 text-white font-semibold text-xs">Conectado</Badge>
            </div>

            {/* Connection Quality */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-lg">
              <div
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  connectionQuality === "excellent"
                    ? "bg-emerald-500"
                    : connectionQuality === "good"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-xs text-white font-semibold">
                {connectionQuality === "excellent"
                  ? "Excelente"
                  : connectionQuality === "good"
                  ? "Bom"
                  : "Instável"}
              </span>
            </div>

            {/* Doctor PiP */}
            <div className="absolute bottom-3 right-3 w-36 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg border-2 border-white/20 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5">
                <Badge className="bg-blue-600 text-white text-xs font-semibold w-full justify-center">
                  Você
                </Badge>
              </div>
            </div>

            {/* Timer */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-mono font-bold text-sm">{sessionDuration}</span>
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`rounded-full w-10 h-10 ${
                    isMicOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`rounded-full w-10 h-10 ${
                    isCameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`rounded-full w-10 h-10 ${
                    isScreenSharing
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-slate-700 rounded-full"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-slate-700 rounded-full"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 rounded-full px-6 font-bold text-xs"
                  onClick={onEncerrar}
                >
                  Encerrar Chamada
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Compartilhar Exame</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs font-semibold">Gerar Receita</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-semibold">Capturar Imagem</span>
          </Button>
        </div>
      </div>

      {/* Right Sidebar — Chat & Transcription */}
      <div className="col-span-4 space-y-3">
        {/* Patient Info */}
        <Card className="border-slate-200 shadow-lg shadow-blue-100/50 overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm">{patient.name}</h3>
                <p className="text-xs text-slate-500">
                  {patient.age} anos · {patient.bloodType}
                </p>
              </div>
            </div>
            <Button
              onClick={onOpenResumoClinico}
              size="sm"
              variant="outline"
              className="w-full h-8 mb-2 text-xs gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
            >
              <FileText className="w-3.5 h-3.5" />
              Resumo Clínico
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              {vitals.slice(0, 2).map((v, idx) => {
                const Icon = v.icon;
                return (
                  <div key={idx} className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Icon className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs text-emerald-700 font-bold">{v.label}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">{v.value}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Chat / Transcrição */}
        <Card
          className="border-slate-200 shadow-lg overflow-hidden flex flex-col"
          style={{ height: "calc(100vh - 300px)" }}
        >
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setIsChatOpen(true)}
              className={`flex-1 px-3 py-2 font-semibold text-xs transition-all ${
                isChatOpen
                  ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1.5" />
              Chat
            </button>
            <button
              onClick={() => setIsChatOpen(false)}
              className={`flex-1 px-3 py-2 font-semibold text-xs transition-all relative ${
                !isChatOpen
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Mic className="w-3 h-3 inline mr-1.5" />
              Transcrição
              {!isChatOpen && isTranscribing && (
                <div className="absolute top-1.5 right-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                    }`}
                  />
                </div>
              )}
            </button>
          </div>

          {isChatOpen ? (
            <>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 ${
                          msg.sender === "doctor"
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                        <span
                          className={`text-xs mt-0.5 block ${
                            msg.sender === "doctor" ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-2 border-t border-slate-200 bg-slate-50">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && chatMessage.trim()) {
                        setChatMessage("");
                      }
                    }}
                  />
                  <Button size="sm" className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Transcrição Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  {!isTranscribing && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-200">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">Análise: OpenAI GPT</span>
                    </div>
                  )}
                  {isTranscribing && (
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
                        isPaused
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                        }`}
                      />
                      <span className="font-medium">{isPaused ? "Pausado" : "Ao vivo"}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isTranscribing ? (
                    <Button
                      onClick={startTranscription}
                      size="sm"
                      className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                    >
                      <Play className="w-2.5 h-2.5" fill="currentColor" />
                      Iniciar
                    </Button>
                  ) : isPaused ? (
                    <>
                      <Button
                        onClick={resumeTranscription}
                        size="sm"
                        className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                      >
                        <Play className="w-2.5 h-2.5" fill="currentColor" />
                        Retomar
                      </Button>
                      <Button
                        onClick={async () => {
                          await stopTranscription();
                          setTimeout(() => handleProcessTranscription(), 1000);
                        }}
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Square className="w-2.5 h-2.5" fill="currentColor" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={pauseTranscription}
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-amber-300 text-amber-600 hover:bg-amber-50"
                      >
                        <Pause className="w-2.5 h-2.5" fill="currentColor" />
                      </Button>
                      <Button
                        onClick={async () => {
                          await stopTranscription();
                          setTimeout(() => handleProcessTranscription(), 1000);
                        }}
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Square className="w-2.5 h-2.5" fill="currentColor" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {transcription.length === 0 && !isTranscribing && (
                    <div className="text-center py-4">
                      <Mic className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500">Nenhuma transcrição ainda</p>
                    </div>
                  )}
                  {transcription.map((entry, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={`text-xs ${
                            entry.speaker === "Médico"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {entry.speaker}
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">{entry.time}</span>
                        {entry.isPartial && (
                          <span className="text-xs text-blue-500 font-medium">(digitando...)</span>
                        )}
                      </div>
                      <p
                        className={`text-xs text-slate-700 leading-relaxed pl-1.5 border-l-2 ${
                          entry.isPartial
                            ? "border-blue-200 border-dashed opacity-75"
                            : "border-blue-200"
                        }`}
                      >
                        {entry.text}
                      </p>
                    </div>
                  ))}
                  {isTranscribing && transcription.length === 0 && (
                    <div className="flex items-center gap-1.5 text-blue-600 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span className="text-xs font-medium">Transcrevendo...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
