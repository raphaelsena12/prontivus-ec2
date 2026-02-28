"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { TelemedicineView } from "@/components/atendimento/consultation/TelemedicineView";
import {
  AlertCircle,
  Loader2,
  Activity,
  Heart,
  Thermometer,
  Wind,
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

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DoctorTelemedicineSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [cameraTestResult, setCameraTestResult] = useState("");

  // Controles de vídeo/áudio
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: number; sender: string; text: string; time: string }[]>([]);

  // Transcrição
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<{ time: string; speaker: string; text: string; isPartial?: boolean }[]>([]);

  // Timer
  const [sessionDuration, setSessionDuration] = useState("00:00");
  const sessionStartRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Chime
  const chimeSessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "unstable">("excellent");

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

      // Mostra link do paciente via toast logo ao carregar
      if (data.patientLink) {
        toast.info("Link do paciente disponível — veja o banner verde no topo da página", {
          duration: 8000,
          action: {
            label: "Copiar",
            onClick: () => navigator.clipboard.writeText(data.patientLink),
          },
        });
      }

      connectToRoom();
    } catch {
      setError("Erro ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Teste de câmera nativo (independente do Chime) ───────────────────────

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
      tracks.forEach(t => t.stop()); // libera câmera após teste
      setCameraTestResult(`✅ Câmera OK: "${videoLabel}" | Microfone OK: "${audioLabel}"`);
    } catch (err: any) {
      setCameraTestResult(`❌ Erro: ${err?.message || err}`);
    }
  };

  // ─── Conecta ao Chime ─────────────────────────────────────────────────────

  const connectToRoom = async () => {
    setConnecting(true);
    setConnectionError("");

    // Verifica contexto seguro antes de qualquer coisa
    if (!window.isSecureContext) {
      setConnectionError("A câmera e o microfone exigem HTTPS. Acesse a aplicação via https:// ou localhost.");
      setConnecting(false);
      return;
    }

    try {
      // 1. Busca credenciais Chime
      console.log("[Chime] Buscando credenciais...");
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}/chime-token`);
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Erro ao obter credenciais de vídeo.";
        console.error("[Chime] Erro nas credenciais:", msg, data);
        setConnectionError(`Erro nas credenciais Chime: ${msg}`);
        return;
      }

      console.log("[Chime] Credenciais OK — Meeting:", data?.Meeting?.MeetingId);

      // 2. Inicializa sessão Chime
      const chimeSession = await initChime(data);
      chimeSessionRef.current = chimeSession;
      const audioVideo = chimeSession.audioVideo;

      // 3. Observer para bind de tiles
      audioVideo.addObserver({
        videoTileDidUpdate: (tileState: any) => {
          if (tileState.localTile && tileState.tileId && localVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
          }
          if (!tileState.localTile && tileState.tileId && remoteVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
          }
        },
        connectionDidBecomeGood: () => setConnectionQuality("excellent"),
        connectionDidBecomePoor: () => setConnectionQuality("unstable"),
        audioVideoDidStop: (status: any) => {
          console.log("[Chime] Sessão encerrada, status code:", status?.statusCode?.());
        },
      });

      // 4. Câmera
      console.log("[Chime] Listando câmeras...");
      const videoDevices = await audioVideo.listVideoInputDevices();
      console.log("[Chime] Câmeras:", videoDevices.length, videoDevices.map((d: any) => d.label));
      if (videoDevices.length > 0) {
        await audioVideo.startVideoInput(videoDevices[0].deviceId);
        console.log("[Chime] Câmera iniciada:", videoDevices[0].label);
      }

      // 5. Microfone
      console.log("[Chime] Listando microfones...");
      const audioDevices = await audioVideo.listAudioInputDevices();
      console.log("[Chime] Microfones:", audioDevices.length, audioDevices.map((d: any) => d.label));
      if (audioDevices.length > 0) {
        await audioVideo.startAudioInput(audioDevices[0].deviceId);
        console.log("[Chime] Microfone iniciado:", audioDevices[0].label);
      }

      // 6. Saída de áudio — não crítico
      try {
        await audioVideo.chooseAudioOutput(null);
      } catch {
        console.warn("[Chime] chooseAudioOutput não suportado — usando padrão do sistema.");
      }

      // 7. Inicia sessão
      console.log("[Chime] Iniciando audioVideo.start()...");
      audioVideo.start();
      audioVideo.startLocalVideoTile();

      // 8. Subscrição ao chat via canal de dados Chime
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

      startTimer();
      toast.success("Câmera e microfone conectados");
      console.log("[Chime] Sucesso!");

    } catch (err: any) {
      const msg = err?.message || String(err) || "Erro desconhecido";
      console.error("[Chime] ERRO:", err);
      setConnectionError(`Falha ao conectar câmera/microfone: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  // ─── Timer ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    sessionStartRef.current = new Date();
    timerRef.current = setInterval(() => {
      if (sessionStartRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000);
        const min = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const sec = (elapsed % 60).toString().padStart(2, "0");
        setSessionDuration(`${min}:${sec}`);
      }
    }, 1000);
  }, []);

  // Rebinda tile local após TelemedicineView montar (connecting → false)
  useEffect(() => {
    if (connecting || !chimeSessionRef.current) return;
    const av = chimeSessionRef.current.audioVideo;
    if (!av) return;
    const localTile = av.getLocalVideoTile();
    if (localTile && localVideoRef.current) {
      av.bindVideoElement(localTile.state().tileId!, localVideoRef.current);
    }
  }, [connecting]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chimeSessionRef.current) {
        chimeSessionRef.current.audioVideo?.stop();
      }
    };
  }, []);

  // ─── Controles ───────────────────────────────────────────────────────────

  const handleToggleMic = useCallback((v: boolean) => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
      if (!v) av.realtimeMuteLocalAudio();
      else av.realtimeUnmuteLocalAudio();
    }
    setIsMicOn(v);
  }, []);

  const handleToggleCamera = useCallback(async (v: boolean) => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
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
    }
    setIsCameraOn(v);
  }, []);

  const handleCopyLink = useCallback(() => {
    const link = sessionData?.patientLink;
    if (!link) return;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }, [sessionData?.patientLink]);

  const handleSendMessage = useCallback((text: string) => {
    const av = chimeSessionRef.current?.audioVideo;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    // Envia pelo canal de dados do Chime para o paciente receber
    if (av) {
      try {
        av.realtimeSendDataMessage("chat", JSON.stringify({ text, sender: "doctor" }), 30000);
      } catch (e) {
        console.warn("[Chat] Erro ao enviar mensagem Chime:", e);
      }
    }
    // Adiciona localmente
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "doctor", text, time },
    ]);
  }, []);

  const handleEncerrar = async () => {
    if (!confirm("Deseja encerrar a consulta de telemedicina?")) return;
    try {
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}/encerrar`, { method: "POST" });
      if (res.ok) {
        if (chimeSessionRef.current) chimeSessionRef.current.audioVideo?.stop();
        if (timerRef.current) clearInterval(timerRef.current);
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

  if (loading || connecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium">
          {connecting ? "Conectando câmera e microfone..." : "Carregando sessão..."}
        </p>
        {connecting && (
          <p className="text-xs text-slate-400 max-w-xs text-center">
            Se o browser pedir permissão de câmera e microfone, clique em <strong>Permitir</strong>.
          </p>
        )}
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

  const { sessao } = sessionData;
  const paciente = sessao.consulta.paciente;
  const idade = paciente.dataNascimento
    ? Math.floor((Date.now() - new Date(paciente.dataNascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : 0;

  const vitals = [
    { icon: Heart, label: "FC", value: "--", unit: "bpm", iconColor: "text-red-500" },
    { icon: Activity, label: "PA", value: "--/--", unit: "mmHg", iconColor: "text-blue-500" },
    { icon: Thermometer, label: "Temp", value: "--", unit: "°C", iconColor: "text-orange-500" },
    { icon: Wind, label: "SpO2", value: "--%", unit: "", iconColor: "text-cyan-500" },
  ];

  return (
    <div className="-mt-4 md:-mt-6 -mb-4 md:-mb-6 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Erro de conexão Chime ────────────────────────────────────────── */}
      {connectionError && (
        <div className="bg-red-950/60 border-b border-red-500/30 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-red-300">Erro ao conectar:</span>
              <span className="text-xs text-red-400 font-mono ml-2">{connectionError}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={testCamera}>
                Testar câmera
              </Button>
              {cameraTestResult && <span className="text-xs text-slate-400 font-mono">{cameraTestResult}</span>}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={connectToRoom} disabled={connecting}>
                <RefreshCw className="w-3 h-3" />Reconectar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
      <TelemedicineView
        patient={{ name: paciente.nome, age: idade, bloodType: "--" }}
        vitals={vitals}
        sessionDuration={sessionDuration}
        connectionQuality={connectionQuality}
        isMicOn={isMicOn}
        setIsMicOn={handleToggleMic}
        isCameraOn={isCameraOn}
        setIsCameraOn={(v) => handleToggleCamera(v)}
        isScreenSharing={isScreenSharing}
        setIsScreenSharing={setIsScreenSharing}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
        isTranscribing={isTranscribing}
        isPaused={isPaused}
        transcription={transcription}
        startTranscription={async () => setIsTranscribing(true)}
        pauseTranscription={() => setIsPaused(true)}
        resumeTranscription={() => setIsPaused(false)}
        stopTranscription={() => { setIsTranscribing(false); setIsPaused(false); }}
        handleProcessTranscription={async () => { toast.info("Processando transcrição..."); }}
        onOpenResumoClinico={() => { window.open(`/medico/pacientes/${paciente.id}`, "_blank"); }}
        onEncerrar={handleEncerrar}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        patientLink={sessionData.patientLink}
      />
      </div>
    </div>
  );
}
