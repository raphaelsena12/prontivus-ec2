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

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [useAWSTranscribe, setUseAWSTranscribe] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionStartTimeRef = useRef<number>(0);
  // OPT-3: flag O(1) para saber se o último item do array é parcial
  const hasPartialRef = useRef(false);
  // OPT-4: ref espelhando transcription para evitar recriar determineSpeaker a cada mudança
  const transcriptionRef = useRef<TranscriptionEntry[]>([]);

  // Contador para alternar entre Médico e Paciente quando não há identificação automática
  const speakerAlternatorRef = useRef<{ lastSpeaker: string; count: number }>({
    lastSpeaker: "Médico",
    count: 0,
  });

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

  // OPT-4: não depende mais de `transcription` — usa transcriptionRef para evitar recriações
  const determineSpeaker = useCallback((awsSpeakerLabel?: string, awsSpeaker?: string, currentTranscription?: TranscriptionEntry[]): string => {
    if (awsSpeaker) {
      return awsSpeaker;
    }
    if (awsSpeakerLabel) {
      return awsSpeakerLabel === "spk_0" || awsSpeakerLabel.includes("0")
        ? "Médico"
        : "Paciente";
    }
    const transcriptList = currentTranscription || transcriptionRef.current;
    const lastEntry = transcriptList[transcriptList.length - 1];
    if (lastEntry && !lastEntry.isPartial) {
      return lastEntry.speaker === "Médico" ? "Paciente" : "Médico";
    }
    return "Médico";
  }, []); // deps vazias: lê transcription via ref

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
      setIsTranscribing(true);
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
          const speaker = determineSpeaker(undefined, undefined, base);
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
        setIsTranscribing(false);
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

      console.log("Reconhecimento terminou. Duração:", duration, "ms. isTranscribing:", isTranscribing, "isPaused:", isPaused);

      if (duration < 1000 && recognitionStartTimeRef.current > 0) {
        console.warn("Reconhecimento terminou muito rapidamente, possivelmente erro. Não reiniciando automaticamente.");
        isStartingRef.current = false;
        setIsTranscribing(false);
        recognitionStartTimeRef.current = 0;
        return;
      }

      recognitionStartTimeRef.current = 0;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      if (isTranscribing && !isPaused && recognitionRef.current === recognition) {
        // OPT-1: reduzido de 1000ms para 100ms — elimina 900ms de janela morta entre frases
        restartTimeoutRef.current = setTimeout(() => {
          try {
            console.log("Reiniciando reconhecimento após delay...");
            if (recognitionRef.current && isTranscribing && !isPaused) {
              recognitionRef.current.start();
            }
          } catch (error: any) {
            console.error("Erro ao reiniciar reconhecimento:", error);
            if (!error.message?.includes("already") && !error.message?.includes("started")) {
              setIsTranscribing(false);
            }
          }
        }, 100);
      } else {
        console.log("Não reiniciando - isTranscribing:", isTranscribing, "isPaused:", isPaused, "recognition match:", recognitionRef.current === recognition);
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
        setUseAWSTranscribe(true);
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
  const startTranscription = useCallback(async () => {
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
    } catch (error: any) {
      console.error("Erro ao iniciar transcrição:", error);
      isStartingRef.current = false;
      toast.error(
        error.message || "Erro ao acessar o microfone. Verifique as permissões."
      );
      setIsTranscribing(false);
    }
  }, [startWebSpeechRecognition, sendAudioChunk, startAWSTranscription, isTranscribing, isPaused]);

  // Pausar transcrição
  const pauseTranscription = useCallback(() => {
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

    toast.info("Transcrição pausada");
  }, []);

  // Retomar transcrição
  const resumeTranscription = useCallback(() => {
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

    toast.success("Transcrição retomada");
  }, []);

  // Parar transcrição
  const stopTranscription = useCallback(() => {
    isStartingRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    setIsTranscribing(false);
    setIsPaused(false);
    setUseAWSTranscribe(false);

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

      let transcriptionText = transcription
        .filter((entry) => !entry.isPartial)
        .map((entry) => entry.text)
        .join(" ");

      if (!transcriptionText.trim() && transcription.length > 0) {
        console.log("Nenhuma entrada não parcial encontrada. Usando todas as entradas...");
        transcriptionText = transcription
          .map((entry) => entry.text)
          .join(" ");
      }

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
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
    processTranscription,
  };
}
