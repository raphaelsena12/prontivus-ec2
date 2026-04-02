"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { TelemedicineView } from "@/components/atendimento/consultation/TelemedicineView";
import { useTranscription } from "@/hooks/use-transcription";
import {
  AlertCircle,
  Loader2,
  Activity,
  Heart,
  Thermometer,
  Wind,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// ─── Diálogo de geração de documentos ────────────────────────────────────────

interface Prescricao {
  medicamento: string;
  dosagem: string;
  posologia: string;
  duracao: string;
}

interface DocDialogProps {
  open: boolean;
  documentType: string;
  consultaId: string;
  onClose: () => void;
}

function DocumentGeneratorDialog({ open, documentType, consultaId, onClose }: DocDialogProps) {
  const [generating, setGenerating] = useState(false);
  // Receita
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([
    { medicamento: "", dosagem: "", posologia: "", duracao: "" }
  ]);
  // Atestado
  const [diasAfastamento, setDiasAfastamento] = useState("1");
  const [motivoAtestado, setMotivoAtestado] = useState("");
  // Encaminhamento
  const [especialidadeEncaminha, setEspecialidadeEncaminha] = useState("");
  const [motivoEncaminhamento, setMotivoEncaminhamento] = useState("");
  // Pedido de exame
  const [exames, setExames] = useState<{ nome: string; tipo: string; justificativa: string }[]>([
    { nome: "", tipo: "laboratorial", justificativa: "" }
  ]);

  const titles: Record<string, string> = {
    "receita-medica": "Receita Médica",
    "pedido-exames": "Pedido de Exames",
    "atestado-afastamento": "Atestado de Afastamento",
    "guia-encaminhamento": "Guia de Encaminhamento",
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let dados: any = {};

      if (documentType === "receita-medica") {
        const validas = prescricoes.filter(p => p.medicamento.trim());
        if (validas.length === 0) {
          toast.error("Adicione pelo menos um medicamento");
          return;
        }
        dados.prescricoes = validas;
      } else if (documentType === "atestado-afastamento") {
        dados.diasAfastamento = parseInt(diasAfastamento) || 1;
        dados.motivo = motivoAtestado;
      } else if (documentType === "guia-encaminhamento") {
        if (!especialidadeEncaminha.trim()) {
          toast.error("Informe a especialidade de destino");
          return;
        }
        dados.especialidadeDestino = especialidadeEncaminha;
        dados.motivoEncaminhamento = motivoEncaminhamento;
      } else if (documentType === "pedido-exames") {
        const validos = exames.filter(e => e.nome.trim());
        if (validos.length === 0) {
          toast.error("Adicione pelo menos um exame");
          return;
        }
        dados.exames = validos;
      }

      const res = await fetch("/api/medico/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoDocumento: documentType, consultaId, dados }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar documento");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success(`${titles[documentType] || "Documento"} gerado com sucesso!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar documento");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[documentType] || "Gerar Documento"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* ── Receita Médica ── */}
          {documentType === "receita-medica" && (
            <div className="space-y-3">
              {prescricoes.map((p, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                  {prescricoes.length > 1 && (
                    <button
                      onClick={() => setPrescricoes(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Input
                    placeholder="Medicamento *"
                    value={p.medicamento}
                    onChange={e => setPrescricoes(prev => prev.map((x, idx) => idx === i ? { ...x, medicamento: e.target.value } : x))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Dosagem (ex: 500mg)"
                      value={p.dosagem}
                      onChange={e => setPrescricoes(prev => prev.map((x, idx) => idx === i ? { ...x, dosagem: e.target.value } : x))}
                    />
                    <Input
                      placeholder="Duração (ex: 7 dias)"
                      value={p.duracao}
                      onChange={e => setPrescricoes(prev => prev.map((x, idx) => idx === i ? { ...x, duracao: e.target.value } : x))}
                    />
                  </div>
                  <Input
                    placeholder="Posologia (ex: 1 comprimido 8/8h)"
                    value={p.posologia}
                    onChange={e => setPrescricoes(prev => prev.map((x, idx) => idx === i ? { ...x, posologia: e.target.value } : x))}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrescricoes(prev => [...prev, { medicamento: "", dosagem: "", posologia: "", duracao: "" }])}
                className="w-full gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar medicamento
              </Button>
            </div>
          )}

          {/* ── Pedido de Exames ── */}
          {documentType === "pedido-exames" && (
            <div className="space-y-3">
              {exames.map((e, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                  {exames.length > 1 && (
                    <button
                      onClick={() => setExames(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Input
                    placeholder="Nome do exame *"
                    value={e.nome}
                    onChange={ev => setExames(prev => prev.map((x, idx) => idx === i ? { ...x, nome: ev.target.value } : x))}
                  />
                  <select
                    value={e.tipo}
                    onChange={ev => setExames(prev => prev.map((x, idx) => idx === i ? { ...x, tipo: ev.target.value } : x))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
                  >
                    <option value="laboratorial">Laboratorial</option>
                    <option value="imagem">Imagem</option>
                    <option value="funcional">Funcional</option>
                    <option value="outro">Outro</option>
                  </select>
                  <Input
                    placeholder="Justificativa (opcional)"
                    value={e.justificativa}
                    onChange={ev => setExames(prev => prev.map((x, idx) => idx === i ? { ...x, justificativa: ev.target.value } : x))}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExames(prev => [...prev, { nome: "", tipo: "laboratorial", justificativa: "" }])}
                className="w-full gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar exame
              </Button>
            </div>
          )}

          {/* ── Atestado ── */}
          {documentType === "atestado-afastamento" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Dias de afastamento *</label>
                <Input
                  type="number"
                  min="1"
                  value={diasAfastamento}
                  onChange={e => setDiasAfastamento(e.target.value)}
                  placeholder="Número de dias"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Motivo (opcional)</label>
                <Textarea
                  value={motivoAtestado}
                  onChange={e => setMotivoAtestado(e.target.value)}
                  placeholder="Motivo do afastamento..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Encaminhamento ── */}
          {documentType === "guia-encaminhamento" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Especialidade de destino *</label>
                <Input
                  value={especialidadeEncaminha}
                  onChange={e => setEspecialidadeEncaminha(e.target.value)}
                  placeholder="Ex: Cardiologia, Ortopedia..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Motivo do encaminhamento</label>
                <Textarea
                  value={motivoEncaminhamento}
                  onChange={e => setMotivoEncaminhamento(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gerar e Abrir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: number; sender: string; text: string; time: string }[]>([]);

  // Transcrição real via hook
  const {
    isTranscribing,
    isPaused,
    transcription,
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
    processTranscription,
  } = useTranscription();

  // Processamento de IA — resultados exibidos na aba IA do sidebar (sem modal)

  // Timer
  const [sessionDuration, setSessionDuration] = useState("00:00");
  const sessionStartRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chime
  const chimeSessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "unstable">("excellent");
  const [patientPresent, setPatientPresent] = useState(false);

  // Documento
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docDialogType, setDocDialogType] = useState("receita-medica");

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
          // startLocalVideoTile deve ser chamado após a sessão estar estabelecida
          audioVideo.startLocalVideoTile();
          // Força o play() do áudio remoto dentro do callback da sessão,
          // evitando bloqueio de autoplay do browser (política de user gesture)
          remoteAudioRef.current?.play().catch(() => {});
        },
        videoTileDidUpdate: (tileState: any) => {
          if (!tileState.tileId) return;
          if (tileState.localTile && !tileState.isContent && localVideoRef.current) {
            audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
          } else if (!tileState.localTile && remoteVideoRef.current) {
            // Camera do paciente e screen share remoto vão para remoteVideoRef
            audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
            // Tile remoto apareceu → paciente entrou
            if (!tileState.isContent) setPatientPresent(true);
          }
        },
        videoTileWasRemoved: (_tileId: number) => {
          // Verifica se ainda há tiles remotos — se não houver, paciente saiu
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

      // Observer de compartilhamento de tela — sincroniza estado com eventos do Chime
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

      // Vincula o elemento <audio> para reproduzir o áudio remoto (paciente)
      if (remoteAudioRef.current) {
        audioVideo.bindAudioElement(remoteAudioRef.current);
      }

      // Seleciona saída de áudio (não suportado em todos os browsers — ignora erro)
      try {
        const outputDevices = await audioVideo.listAudioOutputDevices();
        if (outputDevices.length > 0) {
          await audioVideo.chooseAudioOutput(outputDevices[0].deviceId);
        }
      } catch {
        // não crítico
      }

      audioVideo.start();
      // startLocalVideoTile é iniciado dentro do audioVideoDidStart observer acima

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
    } catch (err: any) {
      const msg = err?.message || String(err) || "Erro desconhecido";
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
        // contentShareDidStart observer atualiza setIsScreenSharing(true)
      } else {
        await av.stopContentShare();
        // contentShareDidStop observer atualiza setIsScreenSharing(false)
      }
    } catch (e: any) {
      // Usuário cancelou o seletor de tela ou permissão negada — não altera o estado
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

  // ─── Processar transcrição com IA ─────────────────────────────────────────

  // Retorna os resultados para o TelemedicineView exibir na aba IA (sem modal)
  const handleProcessTranscription = async () => {
    if (transcription.length === 0) return null;
    try {
      const results = await processTranscription();
      if (results) {
        toast.success("Análise clínica concluída!");
        return {
          anamnese: results.anamnese,
          cidCodes: results.cidCodes || [],
          exames: results.exames || [],
          prescricoes: (results as any).prescricoes || [],
        };
      }
      return null;
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar transcrição");
      return null;
    }
  };

  // ─── Encerrar sessão ──────────────────────────────────────────────────────

  const handleEncerrar = async () => {
    if (!confirm("Deseja encerrar a consulta de telemedicina?")) return;
    try {
      const res = await fetch(`/api/medico/telemedicina/sessoes/${sessionId}/encerrar`, { method: "POST" });
      if (res.ok) {
        if (chimeSessionRef.current) chimeSessionRef.current.audioVideo?.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        stopTranscription();
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

  // ─── Abrir diálogo de documento ───────────────────────────────────────────

  const handleOpenDocumentType = useCallback((type: string) => {
    setDocDialogType(type);
    setDocDialogOpen(true);
  }, []);

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

  const { sessao } = sessionData;
  const paciente = sessao.consulta.paciente;
  const consultaId = sessao.consultaId;
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
    <>
      {/* Modal de geração de documento */}
      <DocumentGeneratorDialog
        open={docDialogOpen}
        documentType={docDialogType}
        consultaId={consultaId}
        onClose={() => setDocDialogOpen(false)}
      />

      <div className="-mt-4 md:-mt-6 -mb-4 md:-mb-6 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>

        {/* ── Erro de conexão Chime ── */}
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

        {/* ── Indicador de conexão ── */}
        {connecting && (
          <div className="bg-blue-950/40 border-b border-blue-500/20 px-4 py-2 shrink-0 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm text-blue-300">Conectando câmera e microfone...</span>
          </div>
        )}

        {/* Elemento de áudio sempre no DOM — necessário para bindAudioElement() do Chime */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

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
            setIsScreenSharing={handleToggleScreenSharing}
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
            startTranscription={() => startTranscription(remoteAudioRef.current ?? undefined)}
            pauseTranscription={pauseTranscription}
            resumeTranscription={resumeTranscription}
            stopTranscription={stopTranscription}
            handleProcessTranscription={handleProcessTranscription}
            onOpenResumoClinico={() => window.open(`/medico/pacientes/${paciente.id}`, "_blank")}
            onEncerrar={handleEncerrar}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            patientLink={sessionData.patientLink}
            onOpenDocumentType={handleOpenDocumentType}
            patientPresent={patientPresent}
          />
        </div>
      </div>
    </>
  );
}
