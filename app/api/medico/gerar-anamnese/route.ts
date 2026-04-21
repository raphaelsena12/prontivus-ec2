import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateAnamneseStream } from "@/lib/openai-medical-service";
import { checkTokens, consumeTokens } from "@/lib/token-usage";

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

    // Streaming: retorna text/plain — cliente lê progressivamente e monta a anamnese em tempo real
    const stream = await generateAnamneseStream(transcription);

    let totalUsage: number | undefined;
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
            // O último chunk com stream_options: include_usage traz o usage
            if (chunk.usage?.total_tokens) {
              totalUsage = chunk.usage.total_tokens;
            }
          }
          // Consumir tokens reais após stream completo
          if (clinicaId) {
            consumeTokens(clinicaId, "gerar-anamnese", totalUsage).catch(console.error);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar anamnese:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar anamnese com IA" },
      { status: 500 }
    );
  }
}
