import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from "@aws-sdk/client-transcribe-streaming";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import { TranscriptionResult } from "./transcribe-service";

// Configuração do cliente AWS Transcribe
let transcribeClient: TranscribeStreamingClient | null = null;

export function getTranscribeClient(): TranscribeStreamingClient {
  if (!transcribeClient) {
    // Verificar se as credenciais estão configuradas
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env"
      );
    }
    
    transcribeClient = new TranscribeStreamingClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return transcribeClient;
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

/**
 * Inicia uma sessão de transcrição em streaming com AWS Transcribe
 * usando WebSocket para comunicação em tempo real
 */
export async function startAWSTranscriptionStream(
  onTranscript: (result: TranscriptionResult) => void,
  onError: (error: Error) => void
): Promise<{
  sendAudio: (audioChunk: Buffer) => void;
  stop: () => void;
}> {
  let client: TranscribeStreamingClient;
  try {
    client = getTranscribeClient();
    console.log("Cliente AWS Transcribe criado com sucesso");
  } catch (error: any) {
    console.error("Erro ao criar cliente AWS:", error);
    onError(error);
    throw error;
  }
  
  const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8);

  // Stream de áudio para AWS
  const audioStream = new ReadableStream({
    start(controller) {
      (audioStream as any).controller = controller;
    },
  });

  // Converter para formato de evento do AWS
  // O AWS Transcribe espera eventos no formato correto do EventStream
  const audioEventStream = audioStream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        try {
          // O chunk já é um Buffer com dados PCM (Int16Array convertido)
          // O AWS SDK v3 espera o evento no formato EventStream
          // O corpo do evento deve ser o chunk de áudio diretamente (não JSON)
          const marshalledEvent = eventStreamMarshaller.marshall({
            headers: {
              ':message-type': {
                type: 'string',
                value: 'event',
              },
              ':event-type': {
                type: 'string',
                value: 'AudioEvent',
              },
              ':content-type': {
                type: 'string',
                value: 'application/octet-stream',
              },
            },
            body: chunk, // O chunk de áudio diretamente, não JSON
          });
          controller.enqueue(marshalledEvent);
        } catch (error) {
          console.error("Erro ao processar chunk de áudio:", error);
          onError(error as Error);
        }
      },
    })
  );

  try {
    console.log("Iniciando comando de transcrição AWS...");
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: LanguageCode.PT_BR,
      MediaSampleRateHertz: 16000,
      MediaEncoding: "pcm",
      ShowSpeakerLabel: true, // Habilita speaker diarization
      AudioStream: audioEventStream as any,
    });

    console.log("Enviando comando para AWS Transcribe...");
    const response = await client.send(command);
    console.log("Resposta recebida do AWS Transcribe, processando stream...");

    // Processar resultados do stream
    if (response.TranscriptResultStream) {
      const processStream = async () => {
        try {
          console.log("Iniciando processamento do stream de transcrição...");
          for await (const event of response.TranscriptResultStream || []) {
            console.log("Evento recebido do AWS:", event);
            
            if (event.TranscriptEvent?.Transcript?.Results) {
              const results = event.TranscriptEvent.Transcript.Results;
              console.log("Resultados encontrados:", results.length);
              
              for (const result of results) {
                if (result.Alternatives && result.Alternatives.length > 0) {
                  const alternative = result.Alternatives[0];
                  const transcript = alternative.Transcript || "";
                  const isPartial = result.IsPartial || false;
                  
                  // Tentar obter o speaker label do resultado
                  // O speaker label pode estar em diferentes lugares dependendo da versão do SDK
                  let speakerLabel: string | undefined;
                  if ((result as any).SpeakerLabel) {
                    speakerLabel = (result as any).SpeakerLabel;
                  } else if ((alternative as any).Items) {
                    // Tentar obter do primeiro item
                    const firstItem = (alternative as any).Items[0];
                    if (firstItem?.SpeakerLabel) {
                      speakerLabel = firstItem.SpeakerLabel;
                    }
                  }
                  
                  const speaker = getSpeakerLabel(speakerLabel);
                  
                  console.log("Transcrição recebida:", { transcript, isPartial, speaker, speakerLabel });

                  onTranscript({
                    transcript,
                    isPartial,
                    speaker,
                    speakerLabel,
                    startTime: result.StartTime,
                    endTime: result.EndTime,
                  });
                }
              }
            } else if (event.BadRequestException) {
              console.error("BadRequestException:", event.BadRequestException);
              onError(new Error(event.BadRequestException.Message || "Requisição inválida"));
            } else if (event.LimitExceededException) {
              console.error("LimitExceededException:", event.LimitExceededException);
              onError(new Error(event.LimitExceededException.Message || "Limite excedido"));
            } else if (event.InternalFailureException) {
              console.error("InternalFailureException:", event.InternalFailureException);
              onError(new Error(event.InternalFailureException.Message || "Falha interna"));
            }
          }
        } catch (error) {
          console.error("Erro ao processar stream de transcrição:", error);
          onError(error as Error);
        }
      };

      // Executar processamento do stream em background
      processStream().catch((error) => {
        console.error("Erro fatal no processamento do stream:", error);
        onError(error);
      });
    } else {
      console.warn("Nenhum TranscriptResultStream na resposta");
      onError(new Error("Stream de transcrição não disponível na resposta"));
    }

    return {
      sendAudio: (audioChunk: Buffer) => {
        if ((audioStream as any).controller) {
          (audioStream as any).controller.enqueue(audioChunk);
        }
      },
      stop: () => {
        if ((audioStream as any).controller) {
          (audioStream as any).controller.close();
        }
      },
    };
  } catch (error) {
    onError(error as Error);
    throw error;
  }
}










