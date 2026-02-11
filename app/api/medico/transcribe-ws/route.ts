import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
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

// Mapeamento de speakers
const speakerMapping: { [key: string]: string } = {};

function getSpeakerLabel(awsLabel: string | undefined): string {
  if (!awsLabel) return "Médico";
  
  if (speakerMapping[awsLabel]) {
    return speakerMapping[awsLabel];
  }
  
  // Primeiro speaker = Médico, segundo = Paciente
  const label = Object.keys(speakerMapping).length % 2 === 0 ? "Médico" : "Paciente";
  speakerMapping[awsLabel] = label;
  return label;
}

// Esta rota será usada para upgrade do HTTP para WebSocket
// O Socket.IO será inicializado no servidor Next.js customizado
export async function GET(request: NextRequest) {
  return new Response("WebSocket endpoint - use Socket.IO client", {
    status: 200,
  });
}










