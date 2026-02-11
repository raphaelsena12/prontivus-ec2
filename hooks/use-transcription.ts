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
  const [currentPartial, setCurrentPartial] = useState<string>("");
  const [useAWSTranscribe, setUseAWSTranscribe] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionStartTimeRef = useRef<number>(0);
  
  // Contador para alternar entre Médico e Paciente quando não há identificação automática
  const speakerAlternatorRef = useRef<{ lastSpeaker: string; count: number }>({
    lastSpeaker: "Médico",
    count: 0,
  });

  // Função para formatar tempo
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Função para determinar o speaker (com lógica de alternância quando não há identificação automática)
  const determineSpeaker = useCallback((awsSpeakerLabel?: string, awsSpeaker?: string, currentTranscription?: TranscriptionEntry[]): string => {
    // Se o AWS identificou o speaker, usar
    if (awsSpeaker) {
      return awsSpeaker;
    }

    // Se há um label do AWS, mapear
    if (awsSpeakerLabel) {
      // spk_0 = Médico, spk_1 = Paciente (padrão)
      return awsSpeakerLabel === "spk_0" || awsSpeakerLabel.includes("0") 
        ? "Médico" 
        : "Paciente";
    }

    // Fallback: alternar entre Médico e Paciente baseado na última entrada
    // Esta é uma heurística básica - o AWS Transcribe faz isso melhor com speaker diarization
    const transcriptList = currentTranscription || transcription;
    const lastEntry = transcriptList[transcriptList.length - 1];
    if (lastEntry && !lastEntry.isPartial) {
      // Alternar baseado no último speaker não-parcial
      return lastEntry.speaker === "Médico" ? "Paciente" : "Médico";
    }

    return "Médico"; // Default para primeira entrada
  }, [transcription]);

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
    // Verificar se o navegador suporta Web Speech API
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

    // Verificar se já existe uma instância rodando
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

      // Atualizar transcrição parcial
      if (interimTranscript) {
        setCurrentPartial(interimTranscript);
      }

      // Adicionar transcrição final
      if (finalTranscript.trim()) {
        setTranscription((prev) => {
          // Remover a última entrada se for parcial
          const filtered = prev.filter((entry) => !entry.isPartial);
          const speaker = determineSpeaker(undefined, undefined, filtered);
          return [
            ...filtered,
            {
              time: formatTime(new Date()),
              speaker,
              text: finalTranscript.trim(),
            },
          ];
        });
        setCurrentPartial("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error, event);
      if (event.error === "no-speech") {
        // Não fazer nada, apenas aguardar - não encerrar
        console.log("Nenhuma fala detectada, aguardando...");
        return;
      }
      if (event.error === "not-allowed") {
        console.error("Permissão de microfone negada");
        isStartingRef.current = false;
        setIsTranscribing(false);
        toast.error("Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.");
      } else if (event.error === "aborted") {
        // Reconhecimento foi abortado manualmente
        console.log("Reconhecimento abortado");
        return;
      } else {
        console.error(`Erro na transcrição: ${event.error}`);
        // Não parar imediatamente para erros menores
        if (event.error === "network" || event.error === "service-not-allowed") {
          isStartingRef.current = false;
          setIsTranscribing(false);
          toast.error(`Erro na transcrição: ${event.error}`);
        }
      }
    };

    recognition.onend = () => {
      const endTime = Date.now();
      const duration = recognitionStartTimeRef.current > 0 
        ? endTime - recognitionStartTimeRef.current 
        : 0;
      
      console.log("Reconhecimento terminou. Duração:", duration, "ms. isTranscribing:", isTranscribing, "isPaused:", isPaused);
      
      // Se terminou muito rapidamente (< 1 segundo), pode ser um erro
      // Não reiniciar automaticamente nesse caso
      if (duration < 1000 && recognitionStartTimeRef.current > 0) {
        console.warn("Reconhecimento terminou muito rapidamente, possivelmente erro. Não reiniciando automaticamente.");
        isStartingRef.current = false;
        setIsTranscribing(false);
        recognitionStartTimeRef.current = 0;
        return;
      }
      
      // Resetar o tempo de início
      recognitionStartTimeRef.current = 0;
      
      // Limpar timeout anterior se existir
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      // Reiniciar automaticamente se ainda estiver transcrevendo e não estiver pausado
      // Adicionar delay para evitar loop infinito
      if (isTranscribing && !isPaused && recognitionRef.current === recognition) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            console.log("Reiniciando reconhecimento após delay...");
            if (recognitionRef.current && isTranscribing && !isPaused) {
              recognitionRef.current.start();
            }
          } catch (error: any) {
            console.error("Erro ao reiniciar reconhecimento:", error);
            // Se o erro for "already started", está ok
            if (!error.message?.includes("already") && !error.message?.includes("started")) {
              setIsTranscribing(false);
            }
          }
        }, 1000); // Aumentar delay para 1 segundo
      } else {
        console.log("Não reiniciando - isTranscribing:", isTranscribing, "isPaused:", isPaused, "recognition match:", recognitionRef.current === recognition);
      }
    };

    // Salvar referência antes de iniciar
    recognitionRef.current = recognition;
    
    try {
      console.log("Iniciando recognition.start()...");
      recognition.start();
      console.log("recognition.start() chamado com sucesso");
      return true;
    } catch (error: any) {
      console.error("Erro ao chamar recognition.start():", error);
      // Se já estiver rodando, considerar como sucesso
      if (error.message?.includes("already") || error.message?.includes("started") || error.message?.includes("aborted")) {
        console.log("Reconhecimento já está ativo ou foi abortado, tentando novamente...");
        // Limpar e tentar novamente após um pequeno delay
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
      // Conectar ao Socket.IO
      const socket = io("/api/socket", {
        path: "/api/socket",
        transports: ["websocket"],
      });

      socketRef.current = socket;

      // Configurar handlers
      socket.on("connect", () => {
        console.log("✅ Conectado ao servidor WebSocket");
        socket.emit("start-transcription");
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Erro ao conectar ao WebSocket:", error);
        toast.error("Erro ao conectar ao servidor de transcrição");
        setIsTranscribing(false);
      });

      socket.on("transcription-started", () => {
        console.log("✅ Transcrição iniciada via AWS");
        setIsTranscribing(true);
        setUseAWSTranscribe(true);
        toast.success("Transcrição AWS iniciada com speaker diarization");
      });

      socket.on("transcription-result", (data: {
        transcript: string;
        isPartial: boolean;
        speaker: string;
        speakerLabel?: string;
      }) => {
        console.log("📝 Transcrição recebida:", { 
          transcript: data.transcript.substring(0, 50), 
          isPartial: data.isPartial,
          speaker: data.speaker 
        });
        
        if (data.isPartial) {
          setCurrentPartial(data.transcript);
        } else {
          setTranscription((prev) => {
            const filtered = prev.filter((entry) => !entry.isPartial);
            return [
              ...filtered,
              {
                time: formatTime(new Date()),
                speaker: data.speaker,
                text: data.transcript.trim(),
                speakerLabel: data.speakerLabel,
              },
            ];
          });
          setCurrentPartial("");
        }
      });

      socket.on("transcription-error", (error: { message: string }) => {
        console.error("❌ Erro na transcrição:", error);
        toast.error(`Erro na transcrição: ${error.message}`);
        setIsTranscribing(false);
      });

      // Configurar captura de áudio em tempo real
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let audioChunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (!isPaused && socket.connected) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Converter Float32Array para Int16Array (PCM)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          // Converter para base64 e enviar (sem usar Buffer no cliente)
          const uint8Array = new Uint8Array(pcmData.buffer);
          const base64 = btoa(String.fromCharCode(...uint8Array));
          socket.emit("audio-chunk", { chunk: base64 });
          
          audioChunkCount++;
          if (audioChunkCount % 100 === 0) {
            console.log(`🎤 Enviados ${audioChunkCount} chunks de áudio para AWS`);
          }
        } else if (!socket.connected) {
          console.warn("⚠️ Socket não conectado, não enviando áudio");
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
    // Prevenir múltiplas chamadas simultâneas
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
      
      // Solicitar permissão de microfone
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

      // Tentar usar AWS Transcribe via WebSocket primeiro (se disponível)
      const awsAvailable = process.env.NEXT_PUBLIC_USE_AWS_TRANSCRIBE === "true";
      console.log("🔍 Verificando disponibilidade AWS:", {
        awsAvailable,
        envVar: process.env.NEXT_PUBLIC_USE_AWS_TRANSCRIBE,
      });
      
      if (awsAvailable) {
        console.log("🚀 Tentando iniciar transcrição AWS...");
        try {
          const awsStarted = await startAWSTranscription(stream);
          console.log("✅ AWS iniciado?", awsStarted);
          if (awsStarted) {
            isStartingRef.current = false;
            return; // AWS está funcionando
          } else {
            console.warn("⚠️ AWS não iniciou, usando fallback");
          }
        } catch (error: any) {
          console.error("❌ Erro ao iniciar AWS:", error);
          toast.error(`Erro ao iniciar AWS: ${error.message}`);
          // Continuar para fallback
        }
      } else {
        console.log("ℹ️ AWS não habilitado, usando Web Speech API");
      }

      // Fallback: usar Web Speech API
      console.log("Tentando usar Web Speech API...");
      const started = startWebSpeechRecognition();
      console.log("Web Speech iniciado?", started);

      if (started) {
        // Web Speech API iniciou com sucesso
        setIsTranscribing(true);
        isStartingRef.current = false;
        toast.success("Transcrição iniciada");
      } else {
        // Fallback: usar MediaRecorder e enviar para AWS
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

        // Enviar chunks a cada 3 segundos
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

    // Pausar Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Pausar MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }

    // Pausar stream de áudio (sem parar completamente)
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

    // Retomar Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        // Se já estiver rodando, ignorar erro
        console.log("Reconhecimento já está ativo");
      }
    }

    // Retomar MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }

    // Retomar stream de áudio
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
    
    // Limpar timeout de reinício
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    setIsTranscribing(false);
    setIsPaused(false);
    setUseAWSTranscribe(false);

    // Parar WebSocket/AWS
    if (socketRef.current) {
      socketRef.current.emit("stop-transcription");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Parar processamento de áudio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        // Verificar se o AudioContext não está já fechado
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (error) {
        console.warn("Erro ao fechar AudioContext:", error);
      }
      audioContextRef.current = null;
    }

    // Parar Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Parar MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Limpar intervalo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Parar stream de áudio
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Converter última entrada parcial em final antes de limpar
    setTranscription((prev) => {
      const filtered = prev.filter((entry) => !entry.isPartial);
      const partialEntries = prev.filter((entry) => entry.isPartial);
      
      // Se houver entradas parciais, converter a última em final
      if (partialEntries.length > 0) {
        const lastPartial = partialEntries[partialEntries.length - 1];
        if (lastPartial.text && lastPartial.text.trim()) {
          return [
            ...filtered,
            {
              ...lastPartial,
              isPartial: false,
            },
          ];
        }
      }
      
      return filtered;
    });
    
    // Limpar transcrição parcial
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
        // Remover entradas parciais anteriores
        const filtered = prev.filter((entry) => !entry.isPartial);
        return [
          ...filtered,
          {
            time: formatTime(new Date()),
            speaker: "Médico",
            text: currentPartial,
            isPartial: true,
          },
        ];
      });
    } else {
      // Remover entrada parcial se não houver mais texto parcial
      setTranscription((prev) => prev.filter((entry) => !entry.isPartial));
    }
  }, [currentPartial]);

  // Processar transcrição com IA
  const processTranscription = useCallback(async (
    aiModel: 'openai' = 'openai',
    examesIds?: string[]
  ): Promise<{
    anamnese: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    exames: Array<{ nome: string; tipo: string; justificativa: string }>;
    prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string; justificativa?: string }>;
  } | null> => {
    try {
      console.log("Processando transcrição. Total de entradas:", transcription.length);
      console.log("Modelo de IA selecionado:", aiModel);
      console.log("Exames selecionados:", examesIds);
      console.log("Entradas:", transcription);
      
      // Primeiro, tentar usar apenas entradas não parciais
      let transcriptionText = transcription
        .filter((entry) => !entry.isPartial)
        .map((entry) => entry.text)
        .join(" ");

      // Se não houver entradas não parciais, usar todas (incluindo parciais)
      if (!transcriptionText.trim() && transcription.length > 0) {
        console.log("Nenhuma entrada não parcial encontrada. Usando todas as entradas...");
        transcriptionText = transcription
          .map((entry) => entry.text)
          .join(" ");
      }

      console.log("Texto da transcrição para processar:", transcriptionText);
      console.log("Tamanho do texto:", transcriptionText.length);

      if (!transcriptionText.trim() && (!examesIds || examesIds.length === 0)) {
        console.error("Transcrição vazia e nenhum exame selecionado");
        throw new Error("Nenhuma transcrição disponível para processar e nenhum exame selecionado");
      }

      const response = await fetch("/api/medico/process-transcription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription: transcriptionText,
          aiModel, // Passar o modelo selecionado
          examesIds: examesIds || [], // Passar IDs dos exames selecionados
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

