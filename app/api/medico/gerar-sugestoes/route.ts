import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateMedicalSuggestions } from "@/lib/openai-medical-service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { anamnese, alergias, medicamentosEmUso, examesIds } = body;

    if (!anamnese || typeof anamnese !== "string" || !anamnese.trim()) {
      return NextResponse.json({ error: "Anamnese não fornecida ou inválida" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env" },
        { status: 500 }
      );
    }

    const suggestions = await generateMedicalSuggestions({
      anamnese,
      alergias: alergias || [],
      medicamentosEmUso: medicamentosEmUso || [],
      examesIds: examesIds || [],
    });

    return NextResponse.json({ success: true, ...suggestions });
  } catch (error: any) {
    console.error("Erro ao gerar sugestões:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar sugestões com IA" },
      { status: 500 }
    );
  }
}
