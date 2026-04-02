"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

export interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
  speakerLabel?: string; // Label do AWS (spk_0, spk_1, etc.) ou identificação automática
}

export const TRANSCRIPTION_MIN_WORDS = 20;

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  // Sinaliza que a transcrição parou inesperadamente (não por ação do usuário)
  const [stoppedUnexpectedly, setStoppedUnexpectedly] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  // Remote audio (patient) capture
  const remoteMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteChunksRef = useRef<Blob[]>([]);
  const remoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionStartTimeRef = useRef<number>(0);
  // Refs que espelham isTranscribing/isPaused para uso seguro em closures assíncronos (onend, etc.)
  const isTranscribingRef = useRef(false);
  const isPausedRef = useRef(false);
  // OPT-3: flag O(1) para saber se o último item do array é parcial
  const hasPartialRef = useRef(false);
  // OPT-4: ref espelhando transcription para evitar recriar determineSpeaker a cada mudança
  const transcriptionRef = useRef<TranscriptionEntry[]>([]);

  // OPT-4: mantém ref sincronizada sem recalcular callbacks
  useEffect(() => {
    transcriptionRef.current = transcription;
  }, [transcription]);

  // Função para formatar tempo
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Sem diarização real via Web Speech API — retorna label AWS se disponível, senão "Médico"
  const determineSpeaker = useCallback((awsSpeakerLabel?: string, awsSpeaker?: string): string => {
    if (awsSpeaker) return awsSpeaker;
    if (awsSpeakerLabel) {
      return awsSpeakerLabel === "spk_0" || awsSpeakerLabel.includes("0")
        ? "Médico"
        : "Paciente";
    }
    return "Médico";
  }, []);

  // Envia chunk de áudio remoto (paciente) para transcrição via OpenAI Whisper
  const sendPatientAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!isTranscribingRef.current || audioBlob.size === 0) return;
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("speaker", "Paciente");

      const res = await fetch("/api/medico/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.transcript?.trim()) {
        setTranscription((prev) => {
          const newEntry: TranscriptionEntry = {
            time: formatTime(new Date()),
            speaker: "Paciente",
            text: data.transcript.trim(),
          };
          // Insere antes do último item parcial (do médico), se houver
          if (hasPartialRef.current && prev.length > 0 && prev[prev.length - 1].isPartial) {
            return [...prev.slice(0, -1), newEntry, prev[prev.length - 1]];
          }
          return [...prev, newEntry];
        });
      }
    } catch (e) {
      console.error("Erro ao transcrever áudio do paciente:", e);
    }
  }, []);

  // Inicia captura do áudio remoto (voz do paciente via elemento <audio> do Chime)
  const startRemoteAudioCapture = useCallback((remoteAudioEl: HTMLAudioElement) => {
    if (typeof (remoteAudioEl as any).captureStream !== "function") {
      console.warn("captureStream() não suportado neste navegador — voz do paciente não será transcrita");
      return;
    }
    try {
      const remoteStream: MediaStream = (remoteAudioEl as any).captureStream();
      if (!remoteStream || remoteStream.getAudioTracks().length === 0) {
        console.warn("Stream remoto sem faixas de áudio");
        return;
      }

      const recorder = new MediaRecorder(remoteStream, { mimeType: "audio/webm;codecs=opus" });
      remoteMediaRecorderRef.current = recorder;
      remoteChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) remoteChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (remoteChunksRef.current.length === 0) return;
        const blob = new Blob(remoteChunksRef.current, { type: "audio/webm" });
        remoteChunksRef.current = [];
        await sendPatientAudioChunk(blob);
        // Reinicia se ainda transcrevendo
        if (isTranscribingRef.current && !isPausedRef.current && remoteMediaRecorderRef.current) {
          try { remoteMediaRecorderRef.current.start(); } catch (_) {}
        }
      };

      recorder.start();
      remoteIntervalRef.current = setInterval(() => {
        if (remoteMediaRecorderRef.current?.state === "recording") {
          remoteMediaRecorderRef.current.stop(); // onstop reinicia
        }
      }, 5000);

      console.log("Captura de áudio do paciente iniciada");
    } catch (e) {
      console.error("Erro ao iniciar captura remota:", e);
    }
  }, [sendPatientAudioChunk]);

  // Função para enviar chunk de áudio para AWS Transcribe com speaker diarization
  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch("/api/medico/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar áudio para transcrição");
      }

      const data = await response.json();
      if (data.transcript) {
        const speaker = determineSpeaker(data.speakerLabel, data.speaker);
        return {
          transcript: data.transcript,
          speaker,
          speakerLabel: data.speakerLabel,
        };
      }
    } catch (error) {
      console.error("Erro ao enviar chunk de áudio:", error);
    }
    return null;
  }, [determineSpeaker]);

  // Usar Web Speech API como fallback/principal (funciona sem AWS)
  const startWebSpeechRecognition = useCallback(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      toast.error(
        "Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge."
      );
      return false;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (recognitionRef.current) {
      console.log("Já existe uma instância de reconhecimento ativa");
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignorar erro se já estiver parado
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";

    console.log("Criando nova instância de SpeechRecognition");

    recognition.onstart = () => {
      recognitionStartTimeRef.current = Date.now();
      console.log("Web Speech Recognition iniciado com sucesso");
      isStartingRef.current = false;
      isTranscribingRef.current = true;
      setIsTranscribing(true);
      setStoppedUnexpectedly(false);
      toast.success("Transcrição iniciada");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // OPT-2 + OPT-3: atualiza transcription diretamente (sem currentPartial + useEffect)
      // OPT-3: usa slice(0,-1) em vez de filter() — O(1) vs O(n)
      if (interimTranscript) {
        setTranscription(prev => {
          const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
          hasPartialRef.current = true;
          return [...base, {
            time: formatTime(new Date()),
            speaker: "Médico",
            text: interimTranscript,
            isPartial: true,
          }];
        });
      }

      if (finalTranscript.trim()) {
        setTranscription(prev => {
          const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
          hasPartialRef.current = false;
          const speaker = determineSpeaker();
          return [...base, {
            time: formatTime(new Date()),
            speaker,
            text: finalTranscript.trim(),
          }];
        });
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        return;
      }

      if (event.error === "not-allowed") {
        console.error("Permissão de microfone negada");
        isStartingRef.current = false;
        setIsTranscribing(false);
        toast.error("Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.");
      } else if (event.error === "aborted") {
        return;
      } else if (event.error === "network" || event.error === "service-not-allowed") {
        console.error(`Erro na transcrição: ${event.error}`);
        isStartingRef.current = false;
        isTranscribingRef.current = false;
        setIsTranscribing(false);
        setStoppedUnexpectedly(true);
        toast.error(`Erro na transcrição: ${event.error}`);
      } else {
        console.log(`Aviso no reconhecimento: ${event.error}`);
      }
    };

    recognition.onend = () => {
      const endTime = Date.now();
      const duration = recognitionStartTimeRef.current > 0
        ? endTime - recognitionStartTimeRef.current
        : 0;

      console.log("Reconhecimento terminou. Duração:", duration, "ms. isTranscribing:", isTranscribingRef.current, "isPaused:", isPausedRef.current);

      if (duration < 1000 && recognitionStartTimeRef.current > 0) {
        console.warn("Reconhecimento terminou muito rapidamente, possivelmente erro. Não reiniciando automaticamente.");
        isStartingRef.current = false;
        isTranscribingRef.current = false;
        setIsTranscribing(false);
        setStoppedUnexpectedly(true);
        recognitionStartTimeRef.current = 0;
        return;
      }

      recognitionStartTimeRef.current = 0;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      // Usa refs em vez de closure — evita stale isTranscribing/isPaused
      if (isTranscribingRef.current && !isPausedRef.current && recognitionRef.current === recognition) {
        // OPT-1: reduzido de 1000ms para 100ms — elimina 900ms de janela morta entre frases
        restartTimeoutRef.current = setTimeout(() => {
          try {
            console.log("Reiniciando reconhecimento após delay...");
            if (recognitionRef.current && isTranscribingRef.current && !isPausedRef.current) {
              recognitionRef.current.start();
            }
          } catch (error: any) {
            console.error("Erro ao reiniciar reconhecimento:", error);
            if (!error.message?.includes("already") && !error.message?.includes("started")) {
              isTranscribingRef.current = false;
              setIsTranscribing(false);
              setStoppedUnexpectedly(true);
            }
          }
        }, 100);
      } else {
        console.log("Não reiniciando - isTranscribing:", isTranscribingRef.current, "isPaused:", isPausedRef.current, "recognition match:", recognitionRef.current === recognition);
      }
    };

    recognitionRef.current = recognition;

    try {
      console.log("Iniciando recognition.start()...");
      recognition.start();
      console.log("recognition.start() chamado com sucesso");
      return true;
    } catch (error: any) {
      console.error("Erro ao chamar recognition.start():", error);
      if (error.message?.includes("already") || error.message?.includes("started") || error.message?.includes("aborted")) {
        console.log("Reconhecimento já está ativo ou foi abortado, tentando novamente...");
        setTimeout(() => {
          try {
            recognition.start();
            setIsTranscribing(true);
          } catch (e) {
            console.error("Erro ao reiniciar:", e);
          }
        }, 100);
        setIsTranscribing(true);
        return true;
      }
      toast.error(`Erro ao iniciar transcrição: ${error.message || 'Erro desconhecido'}`);
      setIsTranscribing(false);
      return false;
    }
  }, [isTranscribing, isPaused, determineSpeaker]);

  // Iniciar transcrição via WebSocket (AWS Transcribe)
  const startAWSTranscription = useCallback(async (stream: MediaStream) => {
    try {
      const socket = io("/api/socket", {
        path: "/api/socket",
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Conectado ao servidor WebSocket");
        socket.emit("start-transcription");
      });

      socket.on("transcription-started", () => {
        console.log("Transcrição iniciada via AWS");
        setIsTranscribing(true);
        toast.success("Transcrição AWS iniciada com speaker diarization");
      });

      // OPT-2 + OPT-3: mesmo padrão do Web Speech — sem currentPartial, slice O(1)
      socket.on("transcription-result", (data: {
        transcript: string;
        isPartial: boolean;
        speaker: string;
        speakerLabel?: string;
      }) => {
        if (data.isPartial) {
          setTranscription(prev => {
            const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
            hasPartialRef.current = true;
            return [...base, {
              time: formatTime(new Date()),
              speaker: data.speaker,
              text: data.transcript,
              isPartial: true,
            }];
          });
        } else {
          setTranscription(prev => {
            const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
            hasPartialRef.current = false;
            return [...base, {
              time: formatTime(new Date()),
              speaker: data.speaker,
              text: data.transcript.trim(),
              speakerLabel: data.speakerLabel,
            }];
          });
        }
      });

      socket.on("transcription-error", (error: { message: string }) => {
        console.error("Erro na transcrição:", error);
        toast.error(`Erro na transcrição: ${error.message}`);
        setIsTranscribing(false);
      });

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isPaused && socket.connected) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          const uint8Array = new Uint8Array(pcmData.buffer);
          const base64 = btoa(String.fromCharCode(...uint8Array));
          socket.emit("audio-chunk", { chunk: base64 });
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      return true;
    } catch (error: any) {
      console.error("Erro ao iniciar transcrição AWS:", error);
      return false;
    }
  }, [isPaused]);

  // Iniciar transcrição
  const startTranscription = useCallback(async (remoteAudioEl?: HTMLAudioElement | null) => {
    if (isStartingRef.current) {
      console.log("Já está iniciando, ignorando chamada duplicada");
      return;
    }

    if (isTranscribing && !isPaused) {
      console.log("Já está transcrevendo, ignorando");
      return;
    }

    try {
      isStartingRef.current = true;
      console.log("Iniciando transcrição...");
      setIsTranscribing(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      console.log("Permissão de microfone obtida");
      streamRef.current = stream;

      const awsAvailable = process.env.NEXT_PUBLIC_USE_AWS_TRANSCRIBE === "true";
      console.log("AWS disponível?", awsAvailable);

      if (awsAvailable) {
        const awsStarted = await startAWSTranscription(stream);
        console.log("AWS iniciado?", awsStarted);
        if (awsStarted) {
          isStartingRef.current = false;
          if (remoteAudioEl) startRemoteAudioCapture(remoteAudioEl);
          return;
        }
      }

      console.log("Tentando usar Web Speech API...");
      const started = startWebSpeechRecognition();
      console.log("Web Speech iniciado?", started);

      if (started) {
        setIsTranscribing(true);
        isStartingRef.current = false;
        toast.success("Transcrição iniciada");
      } else {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const result = await sendAudioChunk(audioBlob);
          if (result) {
            setTranscription((prev) => [
              ...prev,
              {
                time: formatTime(new Date()),
                speaker: result.speaker,
                text: result.transcript,
                speakerLabel: result.speakerLabel,
              },
            ]);
          }
        };

        console.log("Iniciando MediaRecorder...");
        mediaRecorder.start();
        setIsTranscribing(true);
        isStartingRef.current = false;
        toast.success("Transcrição iniciada");

        intervalRef.current = setInterval(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            mediaRecorder.start();
          }
        }, 3000);
      }

      // Iniciar captura de áudio do paciente (voz remota via Chime)
      if (remoteAudioEl) startRemoteAudioCapture(remoteAudioEl);
    } catch (error: any) {
      console.error("Erro ao iniciar transcrição:", error);
      isStartingRef.current = false;
      toast.error(
        error.message || "Erro ao acessar o microfone. Verifique as permissões."
      );
      setIsTranscribing(false);
    }
  }, [startWebSpeechRecognition, sendAudioChunk, startAWSTranscription, startRemoteAudioCapture, isTranscribing, isPaused]);

  // Pausar transcrição
  const pauseTranscription = useCallback(() => {
    // Atualiza ref antes de parar o recognition — evita que onend tente reiniciar
    isPausedRef.current = true;
    setIsPaused(true);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    if (remoteMediaRecorderRef.current && remoteMediaRecorderRef.current.state === "recording") {
      remoteMediaRecorderRef.current.pause();
    }

    toast.info("Transcrição pausada");
  }, []);

  // Retomar transcrição
  const resumeTranscription = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log("Reconhecimento já está ativo");
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    if (remoteMediaRecorderRef.current && remoteMediaRecorderRef.current.state === "paused") {
      remoteMediaRecorderRef.current.resume();
    }

    toast.success("Transcrição retomada");
  }, []);

  // Parar transcrição
  const stopTranscription = useCallback(() => {
    isStartingRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Atualiza refs antes de parar o recognition — onend não vai tentar reiniciar
    isTranscribingRef.current = false;
    isPausedRef.current = false;
    setIsTranscribing(false);
    setIsPaused(false);
    setStoppedUnexpectedly(false);

    if (socketRef.current) {
      socketRef.current.emit("stop-transcription");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (error) {
        console.warn("Erro ao fechar AudioContext:", error);
      }
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Parar captura de áudio remoto (paciente)
    if (remoteIntervalRef.current) {
      clearInterval(remoteIntervalRef.current);
      remoteIntervalRef.current = null;
    }
    if (remoteMediaRecorderRef.current && remoteMediaRecorderRef.current.state !== "inactive") {
      remoteMediaRecorderRef.current.stop();
      remoteMediaRecorderRef.current = null;
    }
    remoteChunksRef.current = [];

    // OPT-3: converte última entrada parcial em final usando hasPartialRef (sem filter)
    setTranscription((prev) => {
      if (hasPartialRef.current && prev.length > 0) {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry.isPartial && lastEntry.text?.trim()) {
          hasPartialRef.current = false;
          return [...prev.slice(0, -1), { ...lastEntry, isPartial: false }];
        }
      }
      hasPartialRef.current = false;
      return prev;
    });

    toast.info("Transcrição parada");
  }, []);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  // Processar transcrição com IA
  const processTranscription = useCallback(async (): Promise<{
    anamnese: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  } | null> => {
    try {
      console.log("Processando transcrição. Total de entradas:", transcription.length);
      console.log("Entradas:", transcription);

      const finalEntries = transcription.filter((entry) => !entry.isPartial);
      const sourceEntries = finalEntries.length > 0 ? finalEntries : transcription;

      let transcriptionText = sourceEntries
        .map((entry) => `[${entry.time}] ${entry.text}`)
        .join("\n");

      console.log("Texto da transcrição para processar:", transcriptionText);
      console.log("Tamanho do texto:", transcriptionText.length);

      if (!transcriptionText.trim()) {
        console.error("Transcrição vazia após processamento");
        throw new Error("Nenhuma transcrição disponível para processar");
      }

      const response = await fetch("/api/medico/process-transcription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription: transcriptionText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar transcrição");
      }

      const data = await response.json();
      return data.analysis;
    } catch (error: any) {
      console.error("Erro ao processar transcrição:", error);
      throw error;
    }
  }, [transcription]);

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
