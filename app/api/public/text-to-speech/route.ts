import { NextRequest, NextResponse } from "next/server";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  VoiceId,
} from "@aws-sdk/client-polly";
import { prisma } from "@/lib/prisma";

function getPollyClient(): PollyClient {
  return new PollyClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

/**
 * Endpoint público de TTS para o painel de chamadas (TV).
 * Valida que o clinicaId existe no banco antes de sintetizar.
 */
export async function POST(request: NextRequest) {
  try {
    const { text, clinicaId } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto não fornecido" }, { status: 400 });
    }

    if (!clinicaId || typeof clinicaId !== "string") {
      return NextResponse.json({ error: "clinicaId obrigatório" }, { status: 400 });
    }

    // Validar que a clínica existe (proteção contra abuso)
    const tenant = await prisma.tenant.findUnique({
      where: { id: clinicaId },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: "Credenciais AWS não configuradas" },
        { status: 500 }
      );
    }

    const pollyClient = getPollyClient();
    const region = process.env.AWS_REGION || "us-east-1";
    const useNeural =
      region === "us-east-1" || region === "us-west-2" || region === "eu-west-1";

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: VoiceId.Camila,
      Engine: useNeural ? Engine.NEURAL : Engine.STANDARD,
      LanguageCode: "pt-BR",
      TextType: "text",
      SampleRate: "22050",
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      return NextResponse.json(
        { error: "AudioStream não retornado" },
        { status: 500 }
      );
    }

    // Converter stream para buffer
    const audioStream = response.AudioStream as any;
    const chunks: Uint8Array[] = [];

    if (typeof audioStream[Symbol.asyncIterator] === "function") {
      for await (const chunk of audioStream) {
        if (chunk) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        }
      }
    } else if (audioStream instanceof ReadableStream || typeof audioStream.getReader === "function") {
      const reader = (audioStream.body || audioStream).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: "Áudio vazio" }, { status: 500 });
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new NextResponse(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": totalLength.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[public/text-to-speech] erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar áudio" },
      { status: 500 }
    );
  }
}
