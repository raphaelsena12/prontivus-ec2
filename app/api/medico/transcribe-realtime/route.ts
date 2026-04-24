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
          model: "gpt-4o-transcribe",
          language: "pt",
          // Prompt neutro e restritivo: evita que o modelo "complete" diálogos
          // plausíveis quando há silêncio ou ruído. NÃO mencionar consulta/médico/paciente
          // aqui, pois isso induz alucinação de diálogo clínico.
          prompt:
            "Transcreva literalmente apenas as palavras faladas em português brasileiro. " +
            "Se houver silêncio, ruído ou fala ininteligível, NÃO transcreva nada — retorne vazio. " +
            "Não invente palavras, não complete frases, não adicione saudações ou perguntas que não foram ditas.",
        },
        // server_vad com threshold 0.6: captura voz do paciente (distante do mic)
        // em consulta presencial, mantendo margem segura acima do ruído ambiente.
        // Proteção contra alucinação vem do prompt anti-alucinação + filtros client-side.
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 900,
          create_response: false,
        },
        // far_field capta melhor voz do paciente em consulta presencial (~1m do mic).
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
