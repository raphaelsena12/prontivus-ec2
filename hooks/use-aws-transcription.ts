"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
  speakerLabel?: string; // Label do AWS (spk_0, spk_1, etc.)
}

// Mapeamento de speakers do AWS para rótulos amigáveis
const speakerMapping: { [key: string]: string } = {};
let speakerCounter = 0;

function getSpeakerLabel(awsLabel: string | undefined): string {
  if (!awsLabel) {
    return "Médico"; // Default
  }

  // Se já mapeamos, retornar
  if (speakerMapping[awsLabel]) {
    return speakerMapping[awsLabel];
  }

  // Primeiro speaker = Médico, segundo = Paciente
  const label = speakerCounter % 2 === 0 ? "Médico" : "Paciente";
  speakerMapping[awsLabel] = label;
  speakerCounter++;
  return label;
}

/**
 * Hook para transcrição usando AWS Transcribe com Speaker Diarization
 * 
 * Este hook usa WebSocket para streaming real com AWS Transcribe,
 * permitindo identificação automática de locutores (Médico vs Paciente)
 */
export function useAWSTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [currentPartial, setCurrentPartial] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Função para formatar tempo
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Função para processar resultado da transcrição com speaker diarization
  const processTranscriptionResult = useCallback(
    (result: {
      transcript: string;
      isPartial: boolean;
      speakerLabel?: string;
      speaker?: string;
    }) => {
      const speaker = result.speaker || getSpeakerLabel(result.speakerLabel);

      if (result.isPartial) {
        setCurrentPartial(result.transcript);
      } else {
        setTranscription((prev) => {
          // Remover entradas parciais anteriores
          const filtered = prev.filter((entry) => !entry.isPartial);
          return [
            ...filtered,
            {
              time: formatTime(new Date()),
              speaker,
              text: result.transcript.trim(),
              speakerLabel: result.speakerLabel,
            },
          ];
        });
        setCurrentPartial("");
      }
    },
    []
  );

  // Enviar chunk de áudio para AWS via WebSocket ou API
  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      // Se WebSocket estiver conectado, enviar via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(audioBlob);
        return;
      }

      // Fallback: enviar via API HTTP
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
        processTranscriptionResult({
          transcript: data.transcript,
          isPartial: false,
          speakerLabel: data.speakerLabel,
          speaker: data.speaker,
        });
      }
    } catch (error) {
      console.error("Erro ao enviar chunk de áudio:", error);
    }
  }, [processTranscriptionResult]);

  // Iniciar transcrição
  const startTranscription = useCallback(async () => {
    try {
      // Solicitar permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Tentar conectar via WebSocket para streaming real
      // Por enquanto, usar MediaRecorder como fallback
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
        await sendAudioChunk(audioBlob);
        audioChunksRef.current = [];
      };

      // Enviar chunks a cada 3 segundos para processamento com speaker diarization
      mediaRecorder.start();
      setIsTranscribing(true);

      intervalRef.current = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          mediaRecorder.start();
        }
      }, 3000);
    } catch (error: any) {
      console.error("Erro ao iniciar transcrição:", error);
      toast.error(
        error.message || "Erro ao acessar o microfone. Verifique as permissões."
      );
      setIsTranscribing(false);
    }
  }, [sendAudioChunk]);

  // Pausar transcrição
  const pauseTranscription = useCallback(() => {
    setIsPaused(true);

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
    setIsTranscribing(false);
    setIsPaused(false);

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

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setCurrentPartial("");
    toast.info("Transcrição parada");
  }, []);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  // Atualizar transcrição com entrada parcial
  useEffect(() => {
    if (currentPartial) {
      setTranscription((prev) => {
        const filtered = prev.filter((entry) => !entry.isPartial);
        return [
          ...filtered,
          {
            time: formatTime(new Date()),
            speaker: "Médico", // Será atualizado quando receber do AWS
            text: currentPartial,
            isPartial: true,
          },
        ];
      });
    } else {
      setTranscription((prev) => prev.filter((entry) => !entry.isPartial));
    }
  }, [currentPartial]);

  return {
    isTranscribing,
    isPaused,
    transcription,
    startTranscription,
    pauseTranscription,
    resumeTranscription,
    stopTranscription,
  };
}










