"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  MessageSquare,
  Send,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Step = "loading" | "info" | "identity" | "consent" | "connecting" | "session" | "finished" | "error";

interface SessionInfo {
  sessionId: string;
  status: string;
  identityVerified: boolean;
  doctorName: string;
  specialty: string | null;
  scheduledAt: string;
  clinicName: string | null;
}

interface ChimeCredentials {
  Meeting: any;
  Attendee: any;
}

// ─── Importação lazy do Chime SDK ────────────────────────────────────────────
// Carregado dinamicamente para evitar erros de SSR

async function initChime(credentials: ChimeCredentials) {
  const {
    MeetingSessionConfiguration,
    DefaultMeetingSession,
    ConsoleLogger,
    DefaultDeviceController,
    LogLevel,
  } = await import("amazon-chime-sdk-js");

  const logger = new ConsoleLogger("Telemedicina", LogLevel.ERROR);
  const deviceController = new DefaultDeviceController(logger);
  const configuration = new MeetingSessionConfiguration(
    credentials.Meeting,
    credentials.Attendee
  );
  const session = new DefaultMeetingSession(configuration, logger, deviceController);
  return session;
}

// ─── Componente interno que usa useSearchParams ───────────────────────────────

function TelemedicineAccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [step, setStep] = useState<Step>("loading");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cpfLastFour, setCpfLastFour] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [cpfAttempts, setCpfAttempts] = useState(0);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: number; text: string; time: string; mine: boolean }[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [sessionDuration, setSessionDuration] = useState("00:00");
  const sessionStartRef = useRef<Date | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chimeSessionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Carrega info da sessão ───────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setErrorMsg("Token de acesso não encontrado. Verifique o link recebido.");
      setStep("error");
      return;
    }
    loadSessionInfo();
  }, [token]);

  const loadSessionInfo = async () => {
    try {
      const res = await fetch(`/api/paciente/telemedicina/sessao/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Link inválido ou expirado.");
        setStep("error");
        return;
      }

      setSessionInfo(data);
      // Se identidade já verificada, pula para consent
      if (data.identityVerified) {
        setStep("consent");
      } else {
        setStep("info");
      }
    } catch {
      setErrorMsg("Erro ao carregar informações da consulta.");
      setStep("error");
    }
  };

  // ─── Timer da sessão ──────────────────────────────────────────────────────

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chimeSessionRef.current) {
        chimeSessionRef.current.audioVideo?.stop();
      }
    };
  }, []);

  // ─── Validar CPF ─────────────────────────────────────────────────────────

  const handleValidateIdentity = async () => {
    if (!/^\d{4}$/.test(cpfLastFour)) {
      setCpfError("Digite exatamente 4 dígitos numéricos.");
      return;
    }

    setLoading(true);
    setCpfError("");

    try {
      const res = await fetch(`/api/paciente/telemedicina/sessao/${token}/validar-identidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfLastFour }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setStep("consent");
      } else {
        const attempts = cpfAttempts + 1;
        setCpfAttempts(attempts);
        if (attempts >= 3) {
          setErrorMsg("Número máximo de tentativas atingido. Contate a clínica.");
          setStep("error");
        } else {
          setCpfError(`CPF incorreto. Você tem ${3 - attempts} tentativa(s) restante(s).`);
        }
      }
    } catch {
      setCpfError("Erro ao validar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Registrar consentimento ──────────────────────────────────────────────

  const handleConsent = async () => {
    if (!consentChecked) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/paciente/telemedicina/sessao/${token}/consentimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentGiven: true, consentVersion: "1.0" }),
      });

      if (res.ok) {
        setStep("connecting");
        await connectToRoom();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Erro ao registrar consentimento.");
        setStep("error");
      }
    } catch {
      setErrorMsg("Erro ao processar consentimento.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Conectar ao Chime ────────────────────────────────────────────────────

  const connectToRoom = async () => {
    try {
      const res = await fetch(`/api/paciente/telemedicina/sessao/${token}/chime-token`);
      const data = await res.json();

      if (!res.ok) {
        // Sala ainda não disponível (médico não entrou)
        if (res.status === 503) {
          setStep("session");
          setSessionInfo((prev) => prev ? { ...prev, status: "waiting" } : prev);
          return;
        }
        setErrorMsg(data.error || "Erro ao entrar na sala.");
        setStep("error");
        return;
      }

      const chimeSession = await initChime(data);
      chimeSessionRef.current = chimeSession;

      const audioVideo = chimeSession.audioVideo;

      // Observer para vídeo remoto (médico)
      audioVideo.addObserver({
        videoTileDidUpdate: (tileState: any) => {
          if (!tileState.localTile && tileState.tileId && remoteVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
          }
        },
      });

      // Bind do vídeo local (paciente)
      const videoDevices = await audioVideo.listVideoInputDevices();
      if (videoDevices.length > 0) {
        await audioVideo.startVideoInput(videoDevices[0].deviceId);
      }

      const audioDevices = await audioVideo.listAudioInputDevices();
      if (audioDevices.length > 0) {
        await audioVideo.startAudioInput(audioDevices[0].deviceId);
      }

      try { await audioVideo.chooseAudioOutput(null); } catch {}
      audioVideo.start();

      if (localVideoRef.current) {
        audioVideo.startLocalVideoTile();
        const localTile = audioVideo.getLocalVideoTile();
        if (localTile) {
          audioVideo.bindVideoElement(localTile.state().tileId!, localVideoRef.current);
        }
      }

      // Subscrição ao chat via canal de dados Chime
      audioVideo.realtimeSubscribeToReceiveDataMessage("chat", (dataMessage: any) => {
        try {
          const payload = JSON.parse(dataMessage.text());
          if (payload.sender !== "patient") {
            const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            setChatMessages((prev) => [
              ...prev,
              { id: Date.now(), text: payload.text, time, mine: false },
            ]);
          }
        } catch {}
      });

      setStep("session");
      startTimer();
    } catch (err) {
      console.error("Erro ao conectar Chime:", err);
      // Coloca em modo "aguardando" mesmo sem Chime (sala não pronta)
      setStep("session");
      setSessionInfo((prev) => prev ? { ...prev, status: "waiting" } : prev);
    }
  };

  // ─── Controles ───────────────────────────────────────────────────────────

  const toggleMic = async () => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
      if (isMicOn) av.realtimeMuteLocalAudio();
      else av.realtimeUnmuteLocalAudio();
    }
    setIsMicOn(!isMicOn);
  };

  const toggleCamera = async () => {
    const av = chimeSessionRef.current?.audioVideo;
    if (av) {
      if (isCameraOn) {
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
    setIsCameraOn(!isCameraOn);
  };

  const sendChatMessage = () => {
    const av = chimeSessionRef.current?.audioVideo;
    if (!chatMsg.trim()) return;
    const text = chatMsg.trim();
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (av) {
      try {
        av.realtimeSendDataMessage("chat", JSON.stringify({ text, sender: "patient" }), 30000);
      } catch (e) {
        console.warn("[Chat] Erro ao enviar mensagem Chime:", e);
      }
    }
    setChatMessages((prev) => [...prev, { id: Date.now(), text, time, mine: true }]);
    setChatMsg("");
  };

  const handleLeave = async () => {
    if (chimeSessionRef.current) {
      chimeSessionRef.current.audioVideo?.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("finished");
  };

  // ─── Renderização ─────────────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // ─── Tela de loading ──────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Carregando consulta...</p>
        </div>
      </div>
    );
  }

  // ─── Tela de erro ─────────────────────────────────────────────────────────

  if (step === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Acesso Indisponível</h1>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <p className="text-sm text-slate-400">
            Em caso de dúvidas, entre em contato com a clínica.
          </p>
        </div>
      </div>
    );
  }

  // ─── Tela de encerramento ─────────────────────────────────────────────────

  if (step === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Consulta Encerrada</h1>
          <p className="text-slate-600 mb-2">
            Sua consulta de telemedicina foi concluída com sucesso.
          </p>
          <p className="text-slate-500 text-sm">
            Você pode fechar esta janela. Obrigado por usar o Prontivus!
          </p>
          {sessionDuration !== "00:00" && (
            <p className="text-xs text-slate-400 mt-4">Duração da consulta: {sessionDuration}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Tela de informações (antes da validação) ─────────────────────────────

  if (step === "info" && sessionInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
            <Video className="w-10 h-10 mx-auto mb-2" />
            <h1 className="text-lg font-bold">Consulta de Telemedicina</h1>
            <p className="text-blue-100 text-sm mt-1">Prontivus</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Médico</p>
                  <p className="font-semibold text-slate-800 text-sm">Dr(a). {sessionInfo.doctorName}</p>
                  {sessionInfo.specialty && (
                    <p className="text-xs text-slate-500">{sessionInfo.specialty}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Calendar className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Data</p>
                  <p className="font-semibold text-slate-800 text-sm">{formatDate(sessionInfo.scheduledAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Clock className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Horário</p>
                  <p className="font-semibold text-slate-800 text-sm">{formatTime(sessionInfo.scheduledAt)}</p>
                </div>
              </div>
              {sessionInfo.clinicName && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <Building2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Clínica</p>
                    <p className="font-semibold text-slate-800 text-sm">{sessionInfo.clinicName}</p>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={() => setStep("identity")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Continuar para Validação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tela de validação de identidade ─────────────────────────────────────

  if (step === "identity") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
            <Shield className="w-10 h-10 mx-auto mb-2" />
            <h1 className="text-lg font-bold">Verificação de Identidade</h1>
            <p className="text-blue-100 text-sm mt-1">Para sua segurança e privacidade</p>
          </div>
          <div className="p-6">
            <p className="text-slate-600 text-sm mb-5">
              Por razões de segurança, precisamos confirmar sua identidade antes de você entrar na consulta.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Digite os 4 últimos dígitos do seu CPF
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={cpfLastFour}
                onChange={(e) => setCpfLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && handleValidateIdentity()}
                placeholder="• • • •"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {cpfError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {cpfError}
                </p>
              )}
            </div>
            <Button
              onClick={handleValidateIdentity}
              disabled={loading || cpfLastFour.length !== 4}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Validar Identidade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tela de consentimento LGPD ───────────────────────────────────────────

  if (step === "consent") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2" />
            <h1 className="text-lg font-bold">Termo de Consentimento</h1>
            <p className="text-emerald-100 text-sm mt-1">Leia com atenção antes de prosseguir</p>
          </div>
          <div className="p-6">
            <ScrollArea className="h-52 rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
              <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                <h3 className="font-bold text-slate-800">TERMO DE CONSENTIMENTO PARA TELEMEDICINA</h3>
                <p>
                  Ao prosseguir, você declara estar ciente e concordar com os seguintes termos referentes
                  à sua consulta de telemedicina realizada através da plataforma Prontivus:
                </p>
                <p>
                  <strong>1. Consentimento informado:</strong> Você consente em participar de uma consulta médica
                  por videoconferência, compreendendo que esta modalidade possui limitações em comparação
                  à consulta presencial.
                </p>
                <p>
                  <strong>2. Coleta e tratamento de dados (LGPD):</strong> Seus dados pessoais e de saúde
                  coletados durante esta consulta serão tratados em conformidade com a Lei Geral de
                  Proteção de Dados (Lei nº 13.709/2018), sendo utilizados exclusivamente para fins
                  de prestação de serviços médicos.
                </p>
                <p>
                  <strong>3. Gravação:</strong> A consulta NÃO será gravada sem seu consentimento expresso.
                </p>
                <p>
                  <strong>4. Confidencialidade:</strong> As informações compartilhadas durante a consulta
                  são protegidas pelo sigilo médico, conforme a ética e legislação brasileira.
                </p>
                <p>
                  <strong>5. Emergências:</strong> Em caso de emergência médica, ligue imediatamente para
                  o SAMU (192) ou Bombeiros (193).
                </p>
                <p>
                  <strong>6. Limitações técnicas:</strong> Você compreende que problemas de conectividade
                  podem afetar a qualidade da consulta e, em tais casos, será necessário reagendar ou
                  migrar para atendimento presencial.
                </p>
                <p>
                  <strong>7. Validade jurídica:</strong> Este consentimento tem validade jurídica nos termos
                  da Resolução CFM nº 2.314/2022 e da MP 2.200-2/2001.
                </p>
                <p>
                  Ao clicar em &quot;Aceitar e Entrar na Consulta&quot;, você confirma que leu, entendeu e
                  concorda com todos os termos acima, incluindo a coleta e tratamento dos seus dados
                  pessoais para fins médicos.
                </p>
              </div>
            </ScrollArea>

            <label className="flex items-start gap-3 mb-5 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                Li e concordo com o Termo de Consentimento para Telemedicina, incluindo o tratamento
                dos meus dados pessoais conforme a LGPD.
              </span>
            </label>

            <Button
              onClick={handleConsent}
              disabled={!consentChecked || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Aceitar e Entrar na Consulta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tela de conectando ───────────────────────────────────────────────────

  if (step === "connecting") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Video className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Conectando à sala...</p>
          <p className="text-slate-400 text-sm">Aguarde enquanto preparamos sua consulta</p>
        </div>
      </div>
    );
  }

  // ─── Tela da sessão de vídeo ──────────────────────────────────────────────

  if (step === "session" && sessionInfo) {
    const isWaiting = sessionInfo.status === "waiting";

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Dr(a). {sessionInfo.doctorName}</p>
              {sessionInfo.specialty && (
                <p className="text-slate-400 text-xs">{sessionInfo.specialty}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isWaiting ? (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                Aguardando médico...
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block mr-1.5 animate-pulse" />
                {sessionDuration}
              </Badge>
            )}
          </div>
        </div>

        {/* Área principal */}
        <div className="flex-1 flex gap-0">
          {/* Vídeo principal */}
          <div className="flex-1 relative bg-slate-900">
            {/* Vídeo do médico (remoto) */}
            {isWaiting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-4 animate-pulse">
                  <Stethoscope className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-slate-300 font-semibold">Aguardando o médico entrar...</p>
                <p className="text-slate-500 text-sm mt-1">Você será conectado automaticamente</p>
              </div>
            ) : (
              <video
                ref={remoteVideoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
              />
            )}

            {/* PiP do paciente */}
            <div className="absolute bottom-4 right-4 w-36 h-28 bg-slate-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover mirror"
                autoPlay
                playsInline
                muted
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 right-1">
                <Badge className="bg-slate-700/80 text-white text-xs w-full justify-center">Você</Badge>
              </div>
            </div>
          </div>

          {/* Chat lateral */}
          <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-white text-sm font-semibold">Chat</span>
            </div>
            <ScrollArea className="flex-1 p-3">
              {chatMessages.length === 0 ? (
                <p className="text-slate-500 text-xs text-center mt-4">Nenhuma mensagem ainda</p>
              ) : (
                <div className="space-y-2">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg p-2 ${msg.mine ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-200"}`}>
                        <p className="text-xs">{msg.text}</p>
                        <span className="text-xs opacity-60 mt-0.5 block">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t border-slate-700">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder="Mensagem..."
                  className="flex-1 bg-slate-700 text-white placeholder-slate-400 text-xs px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                />
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 px-2"
                  onClick={sendChatMessage}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              onClick={toggleMic}
              className={`rounded-full w-12 h-12 ${isMicOn ? "bg-slate-600 hover:bg-slate-500" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button
              size="sm"
              onClick={toggleCamera}
              className={`rounded-full w-12 h-12 ${isCameraOn ? "bg-slate-600 hover:bg-slate-500" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            <Button
              size="sm"
              onClick={handleLeave}
              className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30"
            >
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </Button>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">
            Para encerrar, clique no botão vermelho
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Componente principal com Suspense ──────────────────────────────────────

export default function TelemedicineAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Carregando...</p>
          </div>
        </div>
      }
    >
      <TelemedicineAccessContent />
    </Suspense>
  );
}
