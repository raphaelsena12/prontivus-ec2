import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from "@aws-sdk/client-transcribe-streaming";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";

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

// Mapeamento de speakers para rótulos mais amigáveis
const speakerLabels: { [key: string]: string } = {
  spk_0: "Médico",
  spk_1: "Paciente",
  spk_2: "Médico",
  spk_3: "Paciente",
};

// Função para determinar o speaker baseado no padrão
function getSpeakerLabel(speakerLabel: string | undefined, speakerIndex: number): string {
  if (speakerLabel) {
    // Se o AWS já identificou o speaker, usar o mapeamento
    if (speakerLabels[speakerLabel]) {
      return speakerLabels[speakerLabel];
    }
    // Tentar inferir baseado no índice
    return speakerIndex % 2 === 0 ? "Médico" : "Paciente";
  }
  // Fallback: alternar entre médico e paciente
  return speakerIndex % 2 === 0 ? "Médico" : "Paciente";
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
      });
    }

    // Verificar se as credenciais AWS estão configuradas
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env",
        }),
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "Arquivo de áudio não fornecido" }),
        { status: 400 }
      );
    }

    // Converter o arquivo para buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Para uma implementação completa de streaming, seria necessário:
    // 1. WebSocket para comunicação bidirecional
    // 2. Conversão de áudio para PCM 16kHz
    // 3. Envio contínuo de chunks

    // Por enquanto, retornamos uma resposta indicando que o streaming
    // deve ser implementado via WebSocket
    return new Response(
      JSON.stringify({
        message: "Use WebSocket para streaming real com speaker diarization",
        transcript: "",
        speaker: "Médico",
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar transcrição" }),
      { status: 500 }
    );
  }
}










