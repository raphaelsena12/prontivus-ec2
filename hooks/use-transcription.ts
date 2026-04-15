"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
  speakerLabel?: string;
}

export const TRANSCRIPTION_MIN_WORDS = 20;

const REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

// ─── Filtros anti-alucinação ──────────────────────────────────────────────────
// Padrões de alucinação conhecidos do Whisper/gpt-4o-transcribe em PT
const HALLUCINATION_PATTERNS = [
  // Despedidas e saudações isoladas (alucinação clássica com silêncio)
  /^(obrigad[ao]|tchau|até logo|até mais|até a próxima|adeus|boa tarde|bom dia|boa noite)\.?[!]?$/i,
  // Preenchimentos vocais isolados
  /^(sim|não|ok|okay|tá|claro|certo|ahh?|umm?|hmm?|hã|né|pois|então)[!.,]?$/i,
  // Pontuação isolada
  /^[\s.,!?;:…\-–—]+$/,
  // Alucinações de plataformas de vídeo
  /^(se inscreva|inscreva-se|deixe um like|curta|compartilhe|ative o sino)/i,
  // Alucinações de legenda
  /^(legenda(do)?|legend|subtitle|closed caption|transcri(ção|bing))/i,
  // Repetição de curtos ruídos
  /^(.)\1{4,}$/,
  // Músicas/jingles (alucinação com ruído de fundo)
  /^(♪|🎵|🎶|\[música\]|\[music\]|\[ruído\]|\[noise\])/i,
  // Tags de ação (alucinação de transcrições de vídeo)
  /^\[.{1,30}\]$/,
];

const MIN_CHARS_FOR_ENTRY = 8; // mínimo de caracteres para aceitar
const MIN_WORDS_FOR_ENTRY = 2; // mínimo de palavras para aceitar

function isHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < MIN_CHARS_FOR_ENTRY) return true;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS_FOR_ENTRY) return true;
  return HALLUCINATION_PATTERNS.some((p) => p.test(trimmed));
}

function isDuplicate(text: string, prev: TranscriptionEntry[]): boolean {
  if (prev.length === 0) return false;
  const current = text.trim().toLowerCase().replace(/[.,!?;:]/g, "");
  // Verifica as últimas 3 entradas para pegar repetições com variação de pontuação
  const recent = prev.slice(-3).map((e) => e.text.trim().toLowerCase().replace(/[.,!?;:]/g, ""));
  return recent.some(
    (last) => last === current || last.endsWith(current) || current.endsWith(last)
  );
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [stoppedUnexpectedly, setStoppedUnexpectedly] = useState(false);

  // Refs — usados dentro de closures assíncronas para evitar stale state
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isTranscribingRef = useRef(false);
  const isPausedRef = useRef(false);
  const hasPartialRef = useRef(false);
  const transcriptionRef = useRef<TranscriptionEntry[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalStopRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const PING_INTERVAL_MS = 25_000; // ping a cada 25s para manter conexão viva

  useEffect(() => {
    transcriptionRef.current = transcription;
  }, [transcription]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  // ─── Limpeza de ping/reconnect timers ─────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ─── Limpeza interna ──────────────────────────────────────────────────────
  const teardown = useCallback(() => {
    clearTimers();

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (_) {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }

    // Converte o último parcial em final antes de limpar
    setTranscription((prev) => {
      if (hasPartialRef.current && prev.length > 0 && prev[prev.length - 1].isPartial) {
        const last = prev[prev.length - 1];
        hasPartialRef.current = false;
        if (last.text?.trim()) {
          return [...prev.slice(0, -1), { ...last, isPartial: false }];
        }
        return prev.slice(0, -1);
      }
      hasPartialRef.current = false;
      return prev;
    });
  }, [clearTimers]);

  useEffect(() => () => { teardown(); }, [teardown]);

  // ─── Pipeline de áudio PCM16 @ 24 kHz → base64 → WebSocket ───────────────
  const startAudioPipeline = useCallback((stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // ScriptProcessorNode: suportado em todos os browsers modernos
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!isTranscribingRef.current || isPausedRef.current) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Float32Array → base64 sem estouro de pilha
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < uint8.length; i += chunk) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
      }

      wsRef.current.send(
        JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(binary) })
      );
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, []);

  // ─── Handlers de mensagens do OpenAI Realtime ─────────────────────────────
  const handleWsMessage = useCallback((event: MessageEvent) => {
    let msg: any;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      // Parcial: delta chegando enquanto o usuário fala
      case "conversation.item.input_audio_transcription.delta": {
        const delta: string = msg.delta || "";
        if (!delta || isHallucination(delta)) return;
        setTranscription((prev) => {
          if (hasPartialRef.current && prev.length > 0 && prev[prev.length - 1].isPartial) {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
          }
          hasPartialRef.current = true;
          return [
            ...prev,
            { time: formatTime(new Date()), speaker: "Médico", text: delta, isPartial: true },
          ];
        });
        break;
      }

      // Final: frase completa detectada pelo VAD
      case "conversation.item.input_audio_transcription.completed": {
        const text: string = (msg.transcript || "").trim();
        if (!text) return;
        setTranscription((prev) => {
          const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
          hasPartialRef.current = false;
          // Filtrar alucinações e duplicatas antes de adicionar
          if (isHallucination(text) || isDuplicate(text, base)) return base;
          return [...base, { time: formatTime(new Date()), speaker: "Médico", text }];
        });
        break;
      }

      case "error": {
        console.error("OpenAI Realtime error:", msg.error);
        // Não parar imediatamente — o onclose vai disparar a reconexão automática.
        // Apenas logar erros que não fecham a conexão.
        toast.warning("Erro na transcrição: " + (msg.error?.message || "Erro desconhecido"));
        break;
      }

      // Ignorar eventos informativos
      default:
        break;
    }
  }, []);

  // ─── Ping periódico para manter o WebSocket vivo ──────────────────────────
  const startPing = useCallback(() => {
    clearTimers();

    // Pequeno buffer de silêncio PCM16 (480 samples = 20ms @ 24kHz)
    const silenceSamples = 480;
    const silenceBuffer = new Int16Array(silenceSamples); // zeros = silêncio
    const uint8 = new Uint8Array(silenceBuffer.buffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i += 0x8000) {
      binary += String.fromCharCode(...uint8.subarray(i, i + 0x8000));
    }
    const silenceB64 = btoa(binary);

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Enviar buffer de silêncio como keepalive (a API rejeita audio vazio)
        wsRef.current.send(
          JSON.stringify({ type: "input_audio_buffer.append", audio: silenceB64 })
        );
      }
    }, PING_INTERVAL_MS);
  }, [clearTimers]);

  // ─── Conectar WebSocket (usado tanto no start quanto no reconnect) ────────
  const connectWebSocket = useCallback(
    async (stream: MediaStream, isReconnect = false): Promise<void> => {
      // 1. Token efêmero — API key nunca sai do servidor
      const tokenRes = await fetch("/api/medico/transcribe-realtime", { method: "POST" });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar sessão de transcrição");
      }
      const { token } = await tokenRes.json();
      if (!token) throw new Error("Token de sessão inválido");

      // 2. Limpar WebSocket anterior (se reconexão)
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_) {}
        wsRef.current = null;
      }

      // Limpar pipeline de áudio anterior (se reconexão)
      if (isReconnect) {
        if (processorRef.current) {
          try { processorRef.current.disconnect(); } catch (_) {}
          processorRef.current = null;
        }
        if (sourceRef.current) {
          try { sourceRef.current.disconnect(); } catch (_) {}
          sourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          try { audioContextRef.current.close(); } catch (_) {}
          audioContextRef.current = null;
        }
      }

      // 3. WebSocket → OpenAI Realtime (auth via subprotocol)
      const ws = new WebSocket(REALTIME_URL, [
        "realtime",
        `openai-insecure-api-key.${token}`,
        "openai-beta.realtime-v1",
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text"],
              instructions: "",
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "gpt-4o-transcribe",
                language: "pt",
                prompt:
                  "Transcrição de consulta médica em português brasileiro. " +
                  "Espere termos médicos, nomes de medicamentos, sintomas, diagnósticos e procedimentos clínicos. " +
                  "Transcreva apenas o que for dito. Se não houver fala clara, não transcreva nada.",
              },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "low",
                create_response: false,
              },
              input_audio_noise_reduction: {
                type: "far_field",
              },
            },
          })
        );

        startAudioPipeline(stream, ws);
        startPing();

        reconnectAttemptsRef.current = 0;
        isTranscribingRef.current = true;
        setIsTranscribing(true);
        setStoppedUnexpectedly(false);

        if (isReconnect) {
          toast.success("Transcrição reconectada automaticamente");
        } else {
          toast.success("Transcrição iniciada");
        }
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = () => {
        console.error("WebSocket: erro de conexão com OpenAI Realtime");
      };

      ws.onclose = () => {
        clearTimers();

        if (intentionalStopRef.current) {
          // Parada intencional pelo usuário — não reconectar
          return;
        }

        if (isTranscribingRef.current) {
          isTranscribingRef.current = false;
          setIsTranscribing(false);

          // Tentar reconexão automática
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && streamRef.current) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
            console.log(`Reconectando transcrição (tentativa ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) em ${delay}ms...`);
            toast.info(`Reconectando transcrição... (tentativa ${reconnectAttemptsRef.current})`);

            reconnectTimerRef.current = setTimeout(() => {
              if (!intentionalStopRef.current && streamRef.current) {
                connectWebSocket(streamRef.current, true).catch((err) => {
                  console.error("Falha ao reconectar:", err);
                  setStoppedUnexpectedly(true);
                  toast.error("Não foi possível reconectar a transcrição");
                });
              }
            }, delay);
          } else {
            setStoppedUnexpectedly(true);
            toast.error("Conexão de transcrição encerrada. Clique em Retomar.");
          }
        }
      };
    },
    [startAudioPipeline, handleWsMessage, startPing, clearTimers]
  );

  // ─── Iniciar ──────────────────────────────────────────────────────────────
  const startTranscription = useCallback(
    async (_remoteAudioEl?: HTMLAudioElement | null) => {
      if (isTranscribingRef.current) return;

      // Limpar transcrição anterior
      setTranscription([]);
      transcriptionRef.current = [];

      intentionalStopRef.current = false;
      reconnectAttemptsRef.current = 0;

      try {
        // Microfone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        await connectWebSocket(stream);
      } catch (error: any) {
        console.error("Erro ao iniciar transcrição:", error);
        isTranscribingRef.current = false;
        setIsTranscribing(false);
        toast.error(error.message || "Erro ao acessar o microfone.");
      }
    },
    [connectWebSocket]
  );

  // ─── Pausar ───────────────────────────────────────────────────────────────
  const pauseTranscription = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    // Silencia o microfone — o WebSocket continua aberto
    streamRef.current?.getTracks().forEach((t) => { t.enabled = false; });
    toast.info("Transcrição pausada");
  }, []);

  // ─── Retomar ──────────────────────────────────────────────────────────────
  const resumeTranscription = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    streamRef.current?.getTracks().forEach((t) => { t.enabled = true; });
    toast.success("Transcrição retomada");
  }, []);

  // ─── Parar ────────────────────────────────────────────────────────────────
  const stopTranscription = useCallback(() => {
    intentionalStopRef.current = true;
    reconnectAttemptsRef.current = 0;
    isTranscribingRef.current = false;
    isPausedRef.current = false;
    setIsTranscribing(false);
    setIsPaused(false);
    setStoppedUnexpectedly(false);
    teardown();
    toast.info("Transcrição parada");
  }, [teardown]);

  // ─── Processar com IA ─────────────────────────────────────────────────────
  const processTranscription = useCallback(async (): Promise<{
    anamnese: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  } | null> => {
    const finalEntries = transcriptionRef.current.filter((e) => !e.isPartial);
    const source = finalEntries.length > 0 ? finalEntries : transcriptionRef.current;

    const transcriptionText = source
      .map((e) => `[${e.time}] ${e.speaker}: ${e.text}`)
      .join("\n");

    if (!transcriptionText.trim()) {
      throw new Error("Nenhuma transcrição disponível para processar");
    }

    const response = await fetch("/api/medico/process-transcription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcription: transcriptionText }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Erro ao processar transcrição");
    }

    const data = await response.json();
    return data.analysis;
  }, []);

  return {
    isTranscribing,
    isPaused,
    transcription,
    stoppedUnexpectedly,
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
    processTranscription,
  };
}
