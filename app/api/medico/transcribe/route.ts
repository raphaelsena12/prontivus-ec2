import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from "@aws-sdk/client-transcribe-streaming";

// Configuração do cliente AWS Transcribe
function getTranscribeClient(): TranscribeStreamingClient {
  return new TranscribeStreamingClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

// Mapeamento de speakers identificados pelo AWS
// O AWS retorna spk_0, spk_1, etc. Mapeamos para rótulos mais amigáveis
const speakerMapping: { [key: string]: string } = {};
let speakerIndex = 0;

function getSpeakerLabel(awsSpeakerLabel: string | undefined): string {
  if (!awsSpeakerLabel) {
    return "Médico"; // Default
  }

  // Se já mapeamos este speaker, retornar o rótulo
  if (speakerMapping[awsSpeakerLabel]) {
    return speakerMapping[awsSpeakerLabel];
  }

  // Primeiro speaker = Médico, segundo = Paciente
  const label = speakerIndex % 2 === 0 ? "Médico" : "Paciente";
  speakerMapping[awsSpeakerLabel] = label;
  speakerIndex++;
  return label;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se as credenciais AWS estão configuradas
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        {
          error:
            "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Arquivo de áudio não fornecido" },
        { status: 400 }
      );
    }

    // Converter o arquivo para buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // NOTA: Para uma implementação completa de streaming com speaker diarization,
    // seria necessário usar WebSocket e AWS Transcribe Streaming API.
    // Por enquanto, retornamos uma estrutura que indica que o speaker diarization
    // deve ser processado no lado do cliente ou via WebSocket.

    // Para implementação futura com AWS Transcribe Streaming:
    // 1. Habilitar ShowSpeakerLabel: true
    // 2. Definir MaxSpeakerLabels: 2 (Médico e Paciente)
    // 3. Processar os resultados do stream com speaker labels

    return NextResponse.json({
      message: "Use WebSocket para streaming real com speaker diarization",
      transcript: "",
      speaker: "Médico", // Será determinado pelo AWS Transcribe
      speakerLabel: undefined, // spk_0, spk_1, etc.
    });
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar transcrição" },
      { status: 500 }
    );
  }
}

