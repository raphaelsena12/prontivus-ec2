import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  VoiceId,
} from "@aws-sdk/client-polly";

// Configuração do cliente AWS Polly
function getPollyClient(): PollyClient {
  return new PollyClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
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

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Texto não fornecido" },
        { status: 400 }
      );
    }

    const pollyClient = getPollyClient();
    const region = process.env.AWS_REGION || "us-east-1";

    // Usar voz neural do AWS Polly em português brasileiro
    // Vozes disponíveis: Vitoria (feminina) ou Camila (feminina) ou Thiago (masculina)
    // Engine: neural para melhor qualidade (se suportado na região)
    // Nota: Vozes neurais podem não estar disponíveis em todas as regiões
    const useNeural = region === "us-east-1" || region === "us-west-2" || region === "eu-west-1";
    
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3", // Formato MP3 para melhor compatibilidade
      VoiceId: VoiceId.Camila, // Voz feminina em português brasileiro
      Engine: useNeural ? Engine.NEURAL : Engine.STANDARD, // Usar neural se suportado, senão standard
      LanguageCode: "pt-BR",
      TextType: "text",
      SampleRate: "22050", // Taxa de amostragem para melhor qualidade
    });
    
    console.log(`Usando engine: ${useNeural ? "NEURAL" : "STANDARD"} (região: ${region})`);

    console.log("Enviando comando para AWS Polly...");
    console.log("Configuração:", {
      region: region,
      voiceId: VoiceId.Camila,
      engine: useNeural ? "NEURAL" : "STANDARD",
      textLength: text.length,
    });
    
    let response;
    try {
      response = await pollyClient.send(command);
    } catch (pollyError: any) {
      console.error("Erro ao chamar AWS Polly:", pollyError);
      console.error("Nome do erro:", pollyError.name);
      console.error("Mensagem:", pollyError.message);
      console.error("Stack:", pollyError.stack);
      
      // Verificar se é erro de permissão
      const isPermissionError = 
        pollyError.name === "AccessDeniedException" ||
        pollyError.name === "UnauthorizedOperation" ||
        pollyError.message?.includes("AccessDenied") ||
        pollyError.message?.includes("is not authorized");
      
      return NextResponse.json(
        {
          error: isPermissionError
            ? "Permissão IAM necessária: Adicione a permissão 'polly:SynthesizeSpeech' na política IAM"
            : pollyError.message || "Erro ao chamar AWS Polly",
          details: process.env.NODE_ENV === "development" ? pollyError.stack : undefined,
          isPermissionError,
        },
        { status: 500 }
      );
    }

    if (!response.AudioStream) {
      console.error("AudioStream não retornado pela API Polly");
      console.error("Response:", JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: "Erro ao gerar áudio: AudioStream não retornado" },
        { status: 500 }
      );
    }

    console.log("AudioStream recebido, processando...");
    
    // Converter o stream de áudio para buffer
    // No AWS SDK v3, AudioStream geralmente tem uma propriedade 'body' que é um ReadableStream
    let buffer: Buffer | undefined;
    
    try {
      const audioStream = response.AudioStream as any;
      
      // Verificar se tem propriedade 'body' (comum no AWS SDK v3)
      const streamBody = audioStream.body || audioStream;
      
      // Verificar se é um ReadableStream ou tem método getReader
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      
      if (streamBody instanceof ReadableStream) {
        reader = streamBody.getReader();
      } else if (typeof streamBody.getReader === 'function') {
        reader = streamBody.getReader();
      } else {
        // Tentar como async iterator
        console.log("Tentando processar como async iterator...");
        const chunks: Uint8Array[] = [];
        
        if (audioStream && typeof audioStream[Symbol.asyncIterator] === 'function') {
          for await (const chunk of audioStream) {
            if (chunk) {
              chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
            }
          }
        } else {
          throw new Error(`AudioStream não é um ReadableStream válido. Tipo: ${typeof streamBody}, Keys: ${Object.keys(streamBody || {}).join(', ')}`);
        }
        
        if (chunks.length === 0) {
          throw new Error("Nenhum dado recebido do stream de áudio");
        }
        
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        buffer = Buffer.from(combined);
      }
      
      // Se ainda não temos buffer, processar o reader
      if (!buffer && reader) {
        const chunks: Uint8Array[] = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        if (chunks.length === 0) {
          throw new Error("Nenhum dado recebido do stream de áudio");
        }
        
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        buffer = Buffer.from(combined);
      }
      
      if (!buffer || buffer.length === 0) {
        throw new Error("Nenhum dado recebido do stream de áudio");
      }
      
      console.log(`Buffer de áudio criado: ${buffer.length} bytes`);
    } catch (streamError: any) {
      console.error("Erro ao processar AudioStream:", streamError);
      console.error("Stack:", streamError.stack);
      console.error("AudioStream type:", typeof response.AudioStream);
      console.error("AudioStream keys:", Object.keys(response.AudioStream || {}));
      if ((response.AudioStream as any)?.body) {
        console.error("AudioStream.body type:", typeof (response.AudioStream as any).body);
        console.error("AudioStream.body keys:", Object.keys((response.AudioStream as any).body || {}));
      }
      return NextResponse.json(
        { 
          error: `Erro ao processar stream de áudio: ${streamError.message}`,
          details: process.env.NODE_ENV === "development" ? streamError.stack : undefined,
        },
        { status: 500 }
      );
    }

    if (!buffer || buffer.length === 0) {
      console.error("Buffer de áudio vazio");
      return NextResponse.json(
        { error: "Erro ao processar áudio" },
        { status: 500 }
      );
    }

    // Retornar o áudio como resposta
    if (!buffer) {
      throw new Error("Buffer de áudio não foi criado");
    }
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Erro na síntese de voz:", error);
    
    // Verificar se é erro de permissão IAM
    const errorMessage = error.message || "Erro ao gerar áudio";
    const isPermissionError = 
      errorMessage.includes("AccessDenied") ||
      errorMessage.includes("UnauthorizedOperation") ||
      errorMessage.includes("is not authorized") ||
      error.name === "AccessDeniedException" ||
      error.name === "UnauthorizedOperation";
    
    return NextResponse.json(
      {
        error: isPermissionError 
          ? "Permissão IAM necessária: Adicione a permissão 'polly:SynthesizeSpeech' na política IAM do usuário/role AWS"
          : errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
        isPermissionError,
      },
      { status: 500 }
    );
  }
}
