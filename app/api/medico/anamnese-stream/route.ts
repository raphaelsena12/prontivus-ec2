import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { generateAnamneseStream } from "@/lib/openai-medical-service";
import { checkTokens, consumeTokens } from "@/lib/token-usage";

/**
 * Endpoint streaming de geração de anamnese.
 *
 * Retorna um text/plain com chunks incrementais conforme o modelo gera.
 * O frontend pode consumir via fetch + ReadableStream para mostrar o texto
 * "sendo escrito" em tempo real, em vez de esperar o response completo.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { transcription } = body;
    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json({ error: "Transcrição inválida" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
    }

    const clinicaId = session.user.clinicaId;
    if (clinicaId) {
      const tokenCheck = await checkTokens(clinicaId);
      if (!tokenCheck.allowed) {
        return NextResponse.json(
          { error: "Limite de tokens de IA atingido para este mês." },
          { status: 429 }
        );
      }
    }

    const completion = await generateAnamneseStream(transcription);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let totalTokens = 0;
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
            if (chunk.usage?.total_tokens) {
              totalTokens = chunk.usage.total_tokens;
            }
          }
          if (clinicaId && totalTokens) {
            consumeTokens(clinicaId, "anamnese-stream", totalTokens).catch(console.error);
          }
        } catch (error: any) {
          console.error("Erro no stream da anamnese:", error);
          controller.enqueue(encoder.encode(`\n[ERRO: ${error.message || "falha no streaming"}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("Erro na rota anamnese-stream:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar anamnese streaming" },
      { status: 500 }
    );
  }
}
