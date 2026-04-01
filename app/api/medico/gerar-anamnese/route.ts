import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateAnamneseStream } from "@/lib/openai-medical-service";

const MIN_WORDS = 20;

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

    const wordCount = transcription.trim().split(/\s+/).length;
    if (wordCount < MIN_WORDS) {
      return NextResponse.json(
        { error: `Transcrição muito curta (${wordCount} palavras). Grave pelo menos uma parte da consulta antes de processar.` },
        { status: 422 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env" },
        { status: 500 }
      );
    }

    // Streaming: retorna text/plain — cliente lê progressivamente e monta a anamnese em tempo real
    const stream = await generateAnamneseStream(transcription);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
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
