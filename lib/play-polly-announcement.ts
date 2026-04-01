/**
 * Reproduz texto no alto-falante: AWS Polly via /api/secretaria/text-to-speech,
 * com fallback para Web Speech API (mesmo fluxo do check-in da secretaria).
 */
export type PollyAnnouncementSource = "polly" | "webspeech" | "failed";

async function tryWebSpeech(text: string): Promise<PollyAnnouncementSource> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return "failed";
  }
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => resolve("webspeech");
    utterance.onerror = () => resolve("failed");
    window.speechSynthesis.speak(utterance);
  });
}

export async function playPollyAnnouncement(text: string): Promise<PollyAnnouncementSource> {
  try {
    const response = await fetch("/api/secretaria/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("audio")) {
        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          return tryWebSpeech(text);
        }
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        try {
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              reject(new Error("audio"));
            };
            void audio.play().then(undefined, reject);
          });
          return "polly";
        } catch {
          return tryWebSpeech(text);
        }
      }
    }
  } catch {
    // rede ou erro inesperado — tenta voz do navegador
  }

  return tryWebSpeech(text);
}
