import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateAnamneseOnly } from "@/lib/openai-medical-service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { transcription } = body;

    if (!transcription || typeof transcription !== "string" || !transcription.trim()) {
      return NextResponse.json({ error: "Transcrição não fornecida ou inválida" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env" },
        { status: 500 }
      );
    }

    const result = await generateAnamneseOnly(transcription);

    return NextResponse.json({ success: true, anamnese: result.anamnese });
  } catch (error: any) {
    console.error("Erro ao gerar anamnese:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar anamnese com IA" },
      { status: 500 }
    );
  }
}
