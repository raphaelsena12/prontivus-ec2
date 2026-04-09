"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AtendimentoContent } from "@/app/(protected)/medico/atendimento/atendimento-content";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SessionData {
  patientLink?: string;
  sessao: {
    id: string;
    consultaId: string;
    status: string;
    startedAt: string | null;
    consulta: {
      dataHora: string;
      paciente: {
        id: string;
        nome: string;
        dataNascimento: string | null;
        cpf: string;
        email: string | null;
        telefone: string | null;
      };
    };
  };
}

interface ChimeCredentials {
  Meeting: any;
  Attendee: any;
}

async function initChime(credentials: ChimeCredentials) {
  const {
    MeetingSessionConfiguration,
    DefaultMeetingSession,
    ConsoleLogger,
    DefaultDeviceController,
    LogLevel,
  } = await import("amazon-chime-sdk-js");

  const logger = new ConsoleLogger("TelemedicinaDoctor", LogLevel.WARN);
  const deviceController = new DefaultDeviceController(logger);
  const configuration = new MeetingSessionConfiguration(
    credentials.Meeting,
    credentials.Attendee
  );
  return new DefaultMeetingSession(configuration, logger, deviceController);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DoctorTelemedicineSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [cameraTestResult, setCameraTestResult] = useState("");

  // Controles de vídeo/áudio
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: number; sender: string; text: string; time: string }[]>([]);

  // Chime
  const chimeSessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "unstable">("excellent");
  const [patientPresent, setPatientPresent] = useState(false);

  // ─── Carrega dados da sessão ──────────────────────────────────────────────

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sessão não encontrada.");
        return;
      }

      setSessionData(data);

      if (data.patientLink) {
        toast.info("Link do paciente disponível — veja o banner verde no topo da página", {
          duration: 8000,
          action: {
            label: "Copiar",
            onClick: () => navigator.clipboard.writeText(data.patientLink),
          },
        });
      }
    } catch {
      setError("Erro ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Conecta ao Chime (chamado após a UI estar montada) ───────────────────

  useEffect(() => {
    if (!loading && !error) {
      connectToRoom();
    }
  }, [loading]);

  // ─── Teste de câmera nativo ───────────────────────────────────────────────

  const testCamera = async () => {
    setCameraTestResult("Testando...");
    try {
      if (!window.isSecureContext) {
        setCameraTestResult("❌ Página não está em HTTPS. Câmera bloqueada pelo browser.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraTestResult("❌ Seu browser não suporta acesso à câmera.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const tracks = stream.getTracks();
      const videoLabel = tracks.find(t => t.kind === "video")?.label || "sem nome";
      const audioLabel = tracks.find(t => t.kind === "audio")?.label || "sem nome";
      tracks.forEach(t => t.stop());
      setCameraTestResult(`✅ Câmera OK: "${videoLabel}" | Microfone OK: "${audioLabel}"`);
    } catch (err: any) {
      setCameraTestResult(`❌ Erro: ${err?.message || err}`);
    }
  };

  // ─── Conecta ao Chime ─────────────────────────────────────────────────────

  const connectToRoom = async () => {
    setConnecting(true);
    setConnectionError("");

    if (!window.isSecureContext) {
      setConnectionError("A câmera e o microfone exigem HTTPS. Acesse a aplicação via https:// ou localhost.");
      setConnecting(false);
      return;
    }

    try {
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}/chime-token`);
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Erro ao obter credenciais de vídeo.";
        setConnectionError(`Erro nas credenciais Chime: ${msg}`);
        return;
      }

      const chimeSession = await initChime(data);
      chimeSessionRef.current = chimeSession;
      const audioVideo = chimeSession.audioVideo;

      // Observer para tiles local, remoto e content share
      audioVideo.addObserver({
        audioVideoDidStart: () => {
          audioVideo.startLocalVideoTile();
          remoteAudioRef.current?.play().catch(() => {});
        },
        videoTileDidUpdate: (tileState: any) => {
          if (!tileState.tileId) return;
          if (tileState.localTile && !tileState.isContent && localVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
          } else if (!tileState.localTile && remoteVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
            if (!tileState.isContent) setPatientPresent(true);
          }
        },
        videoTileWasRemoved: (_tileId: number) => {
          const tiles = chimeSessionRef.current?.audioVideo?.getAllVideoTiles?.() ?? [];
          const hasRemote = tiles.some((t: any) => !t.state().localTile && !t.state().isContent);
          if (!hasRemote) setPatientPresent(false);
        },
        connectionDidBecomeGood: () => setConnectionQuality("excellent"),
        connectionDidBecomePoor: () => setConnectionQuality("unstable"),
        audioVideoDidStop: (status: any) => {
          console.log("[Chime] Sessão encerrada, status code:", status?.statusCode?.());
        },
      });

      audioVideo.addContentShareObserver({
        contentShareDidStart: () => setIsScreenSharing(true),
        contentShareDidStop: () => setIsScreenSharing(false),
      });

      const videoDevices = await audioVideo.listVideoInputDevices();
      if (videoDevices.length > 0) {
        await audioVideo.startVideoInput(videoDevices[0].deviceId);
      }

      const audioDevices = await audioVideo.listAudioInputDevices();
      if (audioDevices.length > 0) {
        await audioVideo.startAudioInput(audioDevices[0].deviceId);
      }

      if (remoteAudioRef.current) {
        audioVideo.bindAudioElement(remoteAudioRef.current);
      }

      try {
        const outputDevices = await audioVideo.listAudioOutputDevices();
        if (outputDevices.length > 0) {
          await audioVideo.chooseAudioOutput(outputDevices[0].deviceId);
        }
      } catch {
        // não crítico
      }

      audioVideo.start();

      audioVideo.realtimeSubscribeToReceiveDataMessage("chat", (dataMessage: any) => {
        try {
          const payload = JSON.parse(dataMessage.text());
          if (payload.sender !== "doctor") {
            const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            setChatMessages((prev) => [
              ...prev,
              { id: Date.now(), sender: payload.sender || "patient", text: payload.text, time },
            ]);
          }
        } catch {}
      });

      toast.success("Câmera e microfone conectados");
    } catch (err: any) {
      const msg = err?.message || String(err) || "Erro desconhecido";
      setConnectionError(`Falha ao conectar câmera/microfone: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (chimeSessionRef.current) {
        chimeSessionRef.current.audioVideo?.stop();
      }
    };
  }, []);

  // ─── Controles ───────────────────────────────────────────────────────────

  const handleToggleMic = useCallback(async (v: boolean) => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
      try {
        if (!v) {
          av.realtimeMuteLocalAudio();
          await av.stopAudioInput();
        } else {
          const devices = await av.listAudioInputDevices();
          if (devices.length > 0) {
            await av.startAudioInput(devices[0].deviceId);
          }
          av.realtimeUnmuteLocalAudio();
        }
      } catch (e) {
        console.warn("[Mic] Erro ao alternar:", e);
      }
    }
    setIsMicOn(v);
  }, []);

  const handleToggleScreenSharing = useCallback(async (v: boolean) => {
    const av = chimeSessionRef.current?.audioVideo;
    if (!av) return;
    try {
      if (v) {
        await av.startContentShareFromScreenCapture();
      } else {
        await av.stopContentShare();
      }
    } catch (e: any) {
      console.warn("[ScreenShare] Erro ou cancelamento:", e?.message || e);
    }
  }, []);

  const handleToggleCamera = useCallback(async (v: boolean) => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
      try {
        if (!v) {
          av.stopLocalVideoTile();
          await av.stopVideoInput();
        } else {
          const devices = await av.listVideoInputDevices();
          if (devices.length > 0) {
            await av.startVideoInput(devices[0].deviceId);
            av.startLocalVideoTile();
          }
        }
      } catch (e) {
        console.warn("[Camera] Erro ao alternar:", e);
      }
    }
    setIsCameraOn(v);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    const av = chimeSessionRef.current?.audioVideo;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (av) {
      try {
        av.realtimeSendDataMessage("chat", JSON.stringify({ text, sender: "doctor" }), 30000);
      } catch (e) {
        console.warn("[Chat] Erro ao enviar:", e);
      }
    }
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "doctor", text, time },
    ]);
  }, []);

  // ─── Encerrar sessão ──────────────────────────────────────────────────────

  const handleEncerrar = async () => {
    if (!confirm("Deseja encerrar a consulta de telemedicina?")) return;
    try {
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}/encerrar`, { method: "POST" });
      if (res.ok) {
        if (chimeSessionRef.current) chimeSessionRef.current.audioVideo?.stop();
        toast.success("Consulta encerrada com sucesso");
        router.push("/medico/fila-atendimento");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao encerrar consulta");
      }
    } catch {
      toast.error("Erro ao encerrar consulta");
    }
  };

  // ─── Renderização condicional ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium">Carregando sessão...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-700 font-semibold">{error}</p>
        <button onClick={() => router.back()} className="text-blue-600 text-sm underline">Voltar</button>
      </div>
    );
  }

  if (!sessionData) return null;

  const consultaId = sessionData.sessao.consultaId;

  return (
    <>
      {/* Elemento de áudio sempre no DOM — necessário para bindAudioElement() do Chime */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* ── Erro de conexão Chime ── */}
      {connectionError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap max-w-[1400px] mx-auto">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-red-700">Erro ao conectar:</span>
              <span className="text-xs text-red-600 font-mono ml-2">{connectionError}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100" onClick={testCamera}>
                Testar câmera
              </Button>
              {cameraTestResult && <span className="text-xs text-slate-500 font-mono">{cameraTestResult}</span>}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={connectToRoom} disabled={connecting}>
                <RefreshCw className="w-3 h-3" />Reconectar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Indicador de conexão ── */}
      {connecting && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 shrink-0 flex items-center gap-2 justify-center">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Conectando câmera e microfone...</span>
        </div>
      )}

      {/* Layout unificado — mesmo da consulta presencial com props de telemedicina */}
      <AtendimentoContent
        consultaId={consultaId}
        telemedicinaProps={{
          localVideoRef,
          remoteVideoRef,
          isMicOn,
          onToggleMic: handleToggleMic,
          isCameraOn,
          onToggleCamera: handleToggleCamera,
          isScreenSharing,
          onToggleScreenSharing: handleToggleScreenSharing,
          connectionQuality,
          patientPresent,
          patientLink: sessionData.patientLink,
          chatMessages,
          onSendMessage: handleSendMessage,
          onEncerrar: handleEncerrar,
          remoteAudioRef,
        }}
      />
    </>
  );
}
