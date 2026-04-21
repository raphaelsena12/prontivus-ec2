"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Hook para geração streaming de anamnese.
 * O texto vai sendo atualizado incrementalmente conforme o modelo escreve,
 * dando feedback imediato ao médico em vez de spinner + resposta final.
 */
export function useAnamneseStream() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (transcription: string) => {
    if (!transcription.trim()) {
      setError("Transcrição vazia");
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/medico/anamnese-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const msg = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(msg.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setText(accumulated);
      }

      return accumulated;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Erro ao gerar anamnese");
      }
      return null;
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setText("");
    setError(null);
  }, []);

  return { text, isStreaming, error, generate, cancel, reset };
}
