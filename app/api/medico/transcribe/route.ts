import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const speaker = (formData.get("speaker") as string | null) || "Médico";

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Arquivo de áudio não fornecido" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
    });

    return NextResponse.json({
      transcript: transcription.text,
      speaker,
    });
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar transcrição" },
      { status: 500 }
    );
  }
}
