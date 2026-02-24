// IMPORTANTE: Configurar variáveis de ambiente ANTES de importar o Next.js
// Isso garante que o Turbopack seja desabilitado antes de qualquer inicialização
process.env.NEXT_DISABLE_TURBO = "1";
process.env.TURBOPACK = "0";
process.env.NEXT_WEBPACK = "1";
// Forçar webpack no Windows
if (process.platform === "win32") {
  process.env.NEXT_WEBPACK = "1";
  // Desabilitar Turbopack explicitamente no Windows
  delete process.env.TURBOPACK;
}

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { getSession } from "./lib/auth-helpers";
import { startAWSTranscriptionStream } from "./lib/transcribe-websocket";
import { TranscriptionResult } from "./lib/transcribe-service";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Desabilitar Turbopack no Windows para evitar erros de permissão
// Use webpack tradicional que é mais estável no Windows
// No Windows, forçar uso do webpack através de variáveis de ambiente
const app = next({ 
  dev, 
  hostname, 
  port,
  // Forçar uso do webpack ao invés do Turbopack no Windows
  // O Turbopack causa erros de permissão no Windows
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Inicializar Socket.IO
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Armazenar streams de transcrição ativos
  const activeStreams = new Map<string, {
    sendAudio: (chunk: Buffer) => void;
    stop: () => void;
  }>();

  // Armazenar usuários conectados no chat
  const chatUsers = new Map<string, {
    userId: string;
    clinicaId: string;
    tipo: string;
    status: string;
  }>();

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Iniciar transcrição
    socket.on("start-transcription", async () => {
      try {
        console.log(`[${socket.id}] Iniciando transcrição AWS...`);
        
        // Verificar se as credenciais AWS estão configuradas
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          console.error("Credenciais AWS não configuradas");
          socket.emit("transcription-error", {
            message: "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env",
          });
          return;
        }
        
        const stream = await startAWSTranscriptionStream(
          (result: TranscriptionResult) => {
            // Enviar resultado para o cliente
            console.log(`[${socket.id}] Transcrição recebida:`, result.transcript.substring(0, 50));
            socket.emit("transcription-result", {
              transcript: result.transcript,
              isPartial: result.isPartial,
              speaker: result.speaker,
              speakerLabel: result.speakerLabel,
              startTime: result.startTime,
              endTime: result.endTime,
            });
          },
          (error: Error) => {
            console.error(`[${socket.id}] Erro na transcrição:`, error);
            socket.emit("transcription-error", {
              message: error.message,
            });
          }
        );

        activeStreams.set(socket.id, stream);
        console.log(`[${socket.id}] Transcrição iniciada com sucesso`);
        socket.emit("transcription-started");
      } catch (error: any) {
        console.error(`[${socket.id}] Erro ao iniciar transcrição:`, error);
        socket.emit("transcription-error", {
          message: error.message || "Erro ao iniciar transcrição",
        });
      }
    });

    // Receber chunk de áudio
    socket.on("audio-chunk", (data: { chunk: string }) => {
      const stream = activeStreams.get(socket.id);
      if (stream) {
        try {
          // Converter base64 para Buffer
          const audioBuffer = Buffer.from(data.chunk, "base64");
          stream.sendAudio(audioBuffer);
        } catch (error) {
          console.error(`[${socket.id}] Erro ao processar chunk de áudio:`, error);
        }
      } else {
        console.warn(`[${socket.id}] Tentativa de enviar áudio sem stream ativo`);
      }
    });

    // Pausar transcrição
    socket.on("pause-transcription", () => {
      // A pausa é gerenciada no cliente
      socket.emit("transcription-paused");
    });

    // Parar transcrição
    socket.on("stop-transcription", () => {
      const stream = activeStreams.get(socket.id);
      if (stream) {
        stream.stop();
        activeStreams.delete(socket.id);
      }
      socket.emit("transcription-stopped");
    });

    // ============================================
    // EVENTOS DE CHAT MÉDICO-SECRETÁRIA
    // ============================================

    // Entrar no chat
    socket.on("join-chat", async (data: { userId: string; clinicaId: string; tipo: string; status?: string }) => {
      try {
        const status = data.status || "online";
        chatUsers.set(socket.id, {
          userId: data.userId,
          clinicaId: data.clinicaId,
          tipo: data.tipo,
          status: status,
        });

        // Entrar na sala da clínica
        socket.join(`clinica:${data.clinicaId}`);
        console.log(`Usuário ${data.userId} entrou no chat da clínica ${data.clinicaId} com status ${status}`);

        // Enviar lista de usuários com status para o novo usuário
        const usersInClinica = Array.from(chatUsers.values())
          .filter((user) => user.clinicaId === data.clinicaId && user.userId !== data.userId)
          .map((user) => ({
            userId: user.userId,
            status: user.status,
          }));

        socket.emit("users-status", { users: usersInClinica });

        // Notificar outros usuários sobre o novo status
        socket.to(`clinica:${data.clinicaId}`).emit("user-status-update", {
          userId: data.userId,
          status: status,
        });
      } catch (error) {
        console.error("Erro ao entrar no chat:", error);
      }
    });

    // Enviar mensagem
    socket.on("send-message", async (data: {
      mensagem: {
        id: string;
        clinicaId: string;
        medicoId: string;
        secretariaId: string;
        conteudo: string;
        enviadoPorMedico: boolean;
        createdAt: string;
        medico?: any;
        secretaria?: any;
      };
    }) => {
      try {
        const userInfo = chatUsers.get(socket.id);
        if (!userInfo) {
          socket.emit("chat-error", { message: "Usuário não autenticado no chat" });
          return;
        }

        // Emitir mensagem para todos na sala da clínica
        io.to(`clinica:${data.mensagem.clinicaId}`).emit("new-message", {
          mensagem: data.mensagem,
        });

        console.log(`Mensagem enviada na clínica ${data.mensagem.clinicaId}`);
      } catch (error) {
        console.error("Erro ao enviar mensagem via socket:", error);
        socket.emit("chat-error", { message: "Erro ao enviar mensagem" });
      }
    });

    // Marcar mensagem como lida
    socket.on("message-read", async (data: { mensagemId: string; clinicaId: string }) => {
      try {
        const userInfo = chatUsers.get(socket.id);
        if (!userInfo) {
          return;
        }

        // Notificar outros usuários na sala
        socket.to(`clinica:${data.clinicaId}`).emit("message-read-update", {
          mensagemId: data.mensagemId,
        });
      } catch (error) {
        console.error("Erro ao marcar mensagem como lida:", error);
      }
    });

    // Atualizar status do usuário
    socket.on("update-status", async (data: { userId: string; clinicaId: string; status: string }) => {
      try {
        const userInfo = chatUsers.get(socket.id);
        if (!userInfo || userInfo.userId !== data.userId) {
          return;
        }

        // Atualizar status no mapa
        chatUsers.set(socket.id, {
          ...userInfo,
          status: data.status,
        });

        // Notificar outros usuários na sala sobre a mudança de status
        socket.to(`clinica:${data.clinicaId}`).emit("user-status-update", {
          userId: data.userId,
          status: data.status,
        });

        console.log(`Usuário ${data.userId} mudou status para ${data.status}`);
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
      }
    });

    // Desconexão
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
      const stream = activeStreams.get(socket.id);
      if (stream) {
        stream.stop();
        activeStreams.delete(socket.id);
      }
      
      const userInfo = chatUsers.get(socket.id);
      if (userInfo) {
        // Notificar outros usuários que este usuário ficou offline
        socket.to(`clinica:${userInfo.clinicaId}`).emit("user-status-update", {
          userId: userInfo.userId,
          status: "offline",
        });
      }
      
      chatUsers.delete(socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Servidor pronto em http://${hostname}:${port}`);
      console.log(`> Socket.IO disponível em /api/socket`);
    });
});










