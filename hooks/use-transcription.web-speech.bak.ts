"use client";

// ============================================================
// BACKUP — implementação original usando Web Speech API
// (Chrome webkitSpeechRecognition + MediaRecorder fallback)
// Mantido para rollback se necessário.
// Versão ativa: hooks/use-transcription.ts (OpenAI Realtime)
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

export interface TranscriptionEntry {
  time: string;
  speaker: string;
  text: string;
  isPartial?: boolean;
  speakerLabel?: string;
}

export const TRANSCRIPTION_MIN_WORDS = 20;

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [stoppedUnexpectedly, setStoppedUnexpectedly] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const remoteMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteChunksRef = useRef<Blob[]>([]);
  const remoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionStartTimeRef = useRef<number>(0);
  const isTranscribingRef = useRef(false);
  const isPausedRef = useRef(false);
  const hasPartialRef = useRef(false);
  const transcriptionRef = useRef<TranscriptionEntry[]>([]);

  useEffect(() => {
    transcriptionRef.current = transcription;
  }, [transcription]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const determineSpeaker = useCallback((awsSpeakerLabel?: string, awsSpeaker?: string): string => {
    if (awsSpeaker) return awsSpeaker;
    if (awsSpeakerLabel) {
      return awsSpeakerLabel === "spk_0" || awsSpeakerLabel.includes("0") ? "Médico" : "Paciente";
    }
    return "Médico";
  }, []);

  const sendPatientAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!isTranscribingRef.current || audioBlob.size === 0) return;
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("speaker", "Paciente");
      const res = await fetch("/api/medico/transcribe", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.transcript?.trim()) {
        setTranscription((prev) => {
          const newEntry: TranscriptionEntry = { time: formatTime(new Date()), speaker: "Paciente", text: data.transcript.trim() };
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

  const startRemoteAudioCapture = useCallback((remoteAudioEl: HTMLAudioElement) => {
    if (typeof (remoteAudioEl as any).captureStream !== "function") return;
    try {
      const remoteStream: MediaStream = (remoteAudioEl as any).captureStream();
      if (!remoteStream || remoteStream.getAudioTracks().length === 0) return;
      const recorder = new MediaRecorder(remoteStream, { mimeType: "audio/webm;codecs=opus" });
      remoteMediaRecorderRef.current = recorder;
      remoteChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) remoteChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (remoteChunksRef.current.length === 0) return;
        const blob = new Blob(remoteChunksRef.current, { type: "audio/webm" });
        remoteChunksRef.current = [];
        await sendPatientAudioChunk(blob);
        if (isTranscribingRef.current && !isPausedRef.current && remoteMediaRecorderRef.current) {
          try { remoteMediaRecorderRef.current.start(); } catch (_) {}
        }
      };
      recorder.start();
      remoteIntervalRef.current = setInterval(() => {
        if (remoteMediaRecorderRef.current?.state === "recording") remoteMediaRecorderRef.current.stop();
      }, 5000);
    } catch (e) {
      console.error("Erro ao iniciar captura remota:", e);
    }
  }, [sendPatientAudioChunk]);

  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      const response = await fetch("/api/medico/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Erro ao enviar áudio para transcrição");
      const data = await response.json();
      if (data.transcript) {
        return { transcript: data.transcript, speaker: determineSpeaker(data.speakerLabel, data.speaker), speakerLabel: data.speakerLabel };
      }
    } catch (error) {
      console.error("Erro ao enviar chunk de áudio:", error);
    }
    return null;
  }, [determineSpeaker]);

  const startWebSpeechRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return false;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";
    recognition.onstart = () => {
      recognitionStartTimeRef.current = Date.now();
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
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript += transcript;
      }
      if (interimTranscript) {
        setTranscription(prev => {
          const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
          hasPartialRef.current = true;
          return [...base, { time: formatTime(new Date()), speaker: "Médico", text: interimTranscript, isPartial: true }];
        });
      }
      if (finalTranscript.trim()) {
        setTranscription(prev => {
          const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
          hasPartialRef.current = false;
          return [...base, { time: formatTime(new Date()), speaker: determineSpeaker(), text: finalTranscript.trim() }];
        });
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        isStartingRef.current = false;
        setIsTranscribing(false);
        toast.error("Permissão de microfone negada.");
      } else if (event.error === "network" || event.error === "service-not-allowed") {
        isStartingRef.current = false;
        isTranscribingRef.current = false;
        setIsTranscribing(false);
        setStoppedUnexpectedly(true);
        toast.error(`Erro na transcrição: ${event.error}`);
      }
    };
    recognition.onend = () => {
      const duration = recognitionStartTimeRef.current > 0 ? Date.now() - recognitionStartTimeRef.current : 0;
      if (duration < 1000 && recognitionStartTimeRef.current > 0) {
        isStartingRef.current = false;
        isTranscribingRef.current = false;
        setIsTranscribing(false);
        setStoppedUnexpectedly(true);
        recognitionStartTimeRef.current = 0;
        return;
      }
      recognitionStartTimeRef.current = 0;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (isTranscribingRef.current && !isPausedRef.current && recognitionRef.current === recognition) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            if (recognitionRef.current && isTranscribingRef.current && !isPausedRef.current) {
              recognitionRef.current.start();
            }
          } catch (error: any) {
            if (!error.message?.includes("already") && !error.message?.includes("started")) {
              isTranscribingRef.current = false;
              setIsTranscribing(false);
              setStoppedUnexpectedly(true);
            }
          }
        }, 100);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch (error: any) {
      if (error.message?.includes("already") || error.message?.includes("started") || error.message?.includes("aborted")) {
        setTimeout(() => { try { recognition.start(); setIsTranscribing(true); } catch (e) {} }, 100);
        setIsTranscribing(true);
        return true;
      }
      toast.error(`Erro ao iniciar transcrição: ${error.message || "Erro desconhecido"}`);
      setIsTranscribing(false);
      return false;
    }
  }, [isTranscribing, isPaused, determineSpeaker]);

  const startAWSTranscription = useCallback(async (stream: MediaStream) => {
    try {
      const socket = io("/api/socket", { path: "/api/socket", transports: ["websocket"] });
      socketRef.current = socket;
      socket.on("connect", () => { socket.emit("start-transcription"); });
      socket.on("transcription-started", () => { setIsTranscribing(true); toast.success("Transcrição AWS iniciada"); });
      socket.on("transcription-result", (data: { transcript: string; isPartial: boolean; speaker: string; speakerLabel?: string }) => {
        if (data.isPartial) {
          setTranscription(prev => {
            const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
            hasPartialRef.current = true;
            return [...base, { time: formatTime(new Date()), speaker: data.speaker, text: data.transcript, isPartial: true }];
          });
        } else {
          setTranscription(prev => {
            const base = hasPartialRef.current ? prev.slice(0, -1) : prev;
            hasPartialRef.current = false;
            return [...base, { time: formatTime(new Date()), speaker: data.speaker, text: data.transcript.trim(), speakerLabel: data.speakerLabel }];
          });
        }
      });
      socket.on("transcription-error", (error: { message: string }) => { toast.error(`Erro: ${error.message}`); setIsTranscribing(false); });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
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

  const startTranscription = useCallback(async (remoteAudioEl?: HTMLAudioElement | null) => {
    if (isStartingRef.current) return;
    if (isTranscribing && !isPaused) return;
    try {
      isStartingRef.current = true;
      setIsTranscribing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 } });
      streamRef.current = stream;
      const awsAvailable = process.env.NEXT_PUBLIC_USE_AWS_TRANSCRIBE === "true";
      if (awsAvailable) {
        const awsStarted = await startAWSTranscription(stream);
        if (awsStarted) { isStartingRef.current = false; if (remoteAudioEl) startRemoteAudioCapture(remoteAudioEl); return; }
      }
      const started = startWebSpeechRecognition();
      if (started) { setIsTranscribing(true); isStartingRef.current = false; toast.success("Transcrição iniciada"); }
      else {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const result = await sendAudioChunk(audioBlob);
          if (result) setTranscription((prev) => [...prev, { time: formatTime(new Date()), speaker: result.speaker, text: result.transcript, speakerLabel: result.speakerLabel }]);
        };
        mediaRecorder.start();
        setIsTranscribing(true);
        isStartingRef.current = false;
        toast.success("Transcrição iniciada");
        intervalRef.current = setInterval(() => { if (mediaRecorder.state === "recording") { mediaRecorder.stop(); mediaRecorder.start(); } }, 3000);
      }
      if (remoteAudioEl) startRemoteAudioCapture(remoteAudioEl);
    } catch (error: any) {
      isStartingRef.current = false;
      toast.error(error.message || "Erro ao acessar o microfone.");
      setIsTranscribing(false);
    }
  }, [startWebSpeechRecognition, sendAudioChunk, startAWSTranscription, startRemoteAudioCapture, isTranscribing, isPaused]);

  const pauseTranscription = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.pause();
    streamRef.current?.getTracks().forEach((track) => { track.enabled = false; });
    if (remoteMediaRecorderRef.current?.state === "recording") remoteMediaRecorderRef.current.pause();
    toast.info("Transcrição pausada");
  }, []);

  const resumeTranscription = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (recognitionRef.current) { try { recognitionRef.current.start(); } catch (error) {} }
    if (mediaRecorderRef.current?.state === "paused") mediaRecorderRef.current.resume();
    streamRef.current?.getTracks().forEach((track) => { track.enabled = true; });
    if (remoteMediaRecorderRef.current?.state === "paused") remoteMediaRecorderRef.current.resume();
    toast.success("Transcrição retomada");
  }, []);

  const stopTranscription = useCallback(() => {
    isStartingRef.current = false;
    if (restartTimeoutRef.current) { clearTimeout(restartTimeoutRef.current); restartTimeoutRef.current = null; }
    isTranscribingRef.current = false;
    isPausedRef.current = false;
    setIsTranscribing(false);
    setIsPaused(false);
    setStoppedUnexpectedly(false);
    if (socketRef.current) { socketRef.current.emit("stop-transcription"); socketRef.current.disconnect(); socketRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (audioContextRef.current) { try { if (audioContextRef.current.state !== "closed") audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (mediaRecorderRef.current?.state !== "inactive") { mediaRecorderRef.current?.stop(); mediaRecorderRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (remoteIntervalRef.current) { clearInterval(remoteIntervalRef.current); remoteIntervalRef.current = null; }
    if (remoteMediaRecorderRef.current?.state !== "inactive") { remoteMediaRecorderRef.current?.stop(); remoteMediaRecorderRef.current = null; }
    remoteChunksRef.current = [];
    setTranscription((prev) => {
      if (hasPartialRef.current && prev.length > 0) {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry.isPartial && lastEntry.text?.trim()) { hasPartialRef.current = false; return [...prev.slice(0, -1), { ...lastEntry, isPartial: false }]; }
      }
      hasPartialRef.current = false;
      return prev;
    });
    toast.info("Transcrição parada");
  }, []);

  useEffect(() => { return () => { stopTranscription(); }; }, [stopTranscription]);

  const processTranscription = useCallback(async (): Promise<{
    anamnese: string;
    cidCodes: Array<{ code: string; description: string; score: number }>;
    exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  } | null> => {
    const finalEntries = transcription.filter((entry) => !entry.isPartial);
    const sourceEntries = finalEntries.length > 0 ? finalEntries : transcription;
    const transcriptionText = sourceEntries.map((entry) => `[${entry.time}] ${entry.text}`).join("\n");
    if (!transcriptionText.trim()) throw new Error("Nenhuma transcrição disponível para processar");
    const response = await fetch("/api/medico/process-transcription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcription: transcriptionText }),
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || "Erro ao processar transcrição"); }
    const data = await response.json();
    return data.analysis;
  }, [transcription]);

  return { isTranscribing, isPaused, transcription, stoppedUnexpectedly, startTranscription, pauseTranscription, resumeTranscription, stopTranscription, processTranscription };
}
