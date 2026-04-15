import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { checkTokens, consumeTokens } from "@/lib/token-usage";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const clinicaId = session.user.clinicaId;
  if (clinicaId) {
    const tokenCheck = await checkTokens(clinicaId);
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: "Limite de tokens de IA atingido para este mês. Entre em contato com o administrador da clínica." },
        { status: 429 }
      );
    }
  }

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        modalities: ["text"],
        instructions: "",
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-transcribe", // Muito mais resistente a alucinações que whisper-1
          language: "pt",
          // Prompt âncora médico: reduz drasticamente alucinações ao contextualizar o modelo
          prompt:
            "Transcrição de consulta médica em português brasileiro. " +
            "Espere termos médicos, nomes de medicamentos, sintomas, diagnósticos e procedimentos clínicos. " +
            "Transcreva apenas o que for dito. Se não houver fala clara, não transcreva nada.",
        },
        // Semantic VAD: decide quando o turno termina por semântica, não só por silêncio
        // Elimina transcrições de fragmentos incompletos e ruídos
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low", // espera a frase ser semanticamente completa antes de fechar
          create_response: false,
        },
        // Redução de ruído far_field: ideal para consultório (microfone de laptop/mesa)
        input_audio_noise_reduction: {
          type: "far_field",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("OpenAI Realtime session error:", body);
      return NextResponse.json(
        { error: body?.error?.message || "Erro ao criar sessão OpenAI" },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (clinicaId) {
      consumeTokens(clinicaId, "transcribe-realtime").catch(console.error);
    }

    // Retorna apenas o token efêmero — a API key nunca sai do servidor
    return NextResponse.json({ token: data.client_secret?.value });
  } catch (error: any) {
    console.error("Erro ao criar sessão Realtime:", error);
    return NextResponse.json({ error: "Erro interno ao criar sessão de transcrição" }, { status: 500 });
  }
}
