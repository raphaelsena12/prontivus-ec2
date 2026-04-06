import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { processTranscriptionWithOpenAI } from "@/lib/openai-medical-service";
import { checkTokens, consumeTokens } from "@/lib/token-usage";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { transcription, examesIds = [] } = body;

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "Transcrição não fornecida ou inválida" },
        { status: 400 }
      );
    }

    // Combinar todas as transcrições em um único texto
    const transcriptionText = Array.isArray(transcription)
      ? transcription.map((t: any) => t.text).join(" ")
      : transcription;

    // Validar credenciais OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env",
        },
        { status: 500 }
      );
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

    // Processar com OpenAI GPT (incluindo exames se fornecidos)
    const analysis = await processTranscriptionWithOpenAI(transcriptionText, examesIds);

    if (clinicaId) {
      await consumeTokens(clinicaId, "process-transcription", analysis._usage);
    }

    const { _usage, ...analysisData } = analysis;
    return NextResponse.json({
      success: true,
      analysis: analysisData,
    });
  } catch (error: any) {
    console.error("Erro ao processar transcrição:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao processar transcrição com IA",
      },
      { status: 500 }
    );
  }
}

