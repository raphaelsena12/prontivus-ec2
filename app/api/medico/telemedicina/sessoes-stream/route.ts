import { NextRequest } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/medico/telemedicina/sessoes-stream
// SSE: envia sessões aguardando em tempo real ao médico (substitui polling de 10s)
export async function GET(request: NextRequest) {
  const auth = await checkMedicoAuth();
  if (!auth.authorized) return auth.response;

  const { medicoId, clinicaId } = auth;
  const encoder = new TextEncoder();

  const fetchSessoes = async () => {
    const sessoes = await prisma.telemedicineSession.findMany({
      where: {
        status: { in: ["waiting", "scheduled"] },
        consulta: {
          medicoId,
          clinicaId,
          modalidade: "TELEMEDICINA",
        },
      },
      include: {
        consulta: {
          select: {
            id: true,
            dataHora: true,
            paciente: {
              select: {
                id: true,
                nome: true,
                dataNascimento: true,
                telefone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sessoes.map((s) => ({
      sessionId: s.id,
      status: s.status,
      consultaId: s.consulta.id,
      dataHora: s.consulta.dataHora,
      criadoEm: s.createdAt,
      paciente: {
        id: s.consulta.paciente.id,
        nome: s.consulta.paciente.nome,
        dataNascimento: s.consulta.paciente.dataNascimento,
        telefone: s.consulta.paciente.telefone,
        email: s.consulta.paciente.email,
      },
    }));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
        }
      };

      // Envio inicial imediato
      try {
        const sessoes = await fetchSessoes();
        send({ sessoes });
      } catch {
        // silencioso
      }

      // Atualiza a cada 3s (muito mais rápido que o polling anterior de 10s)
      const dataInterval = setInterval(async () => {
        if (closed) { clearInterval(dataInterval); return; }
        try {
          const sessoes = await fetchSessoes();
          send({ sessoes });
        } catch {
          // silencioso
        }
      }, 3000);

      // Heartbeat a cada 20s para manter a conexão viva
      const heartbeatInterval = setInterval(() => {
        if (closed) { clearInterval(heartbeatInterval); return; }
        sendHeartbeat();
      }, 20000);

      // P1-3: Roda limpeza de sessões expiradas a cada 60s (inline, sem cron externo)
      const timeoutInterval = setInterval(async () => {
        if (closed) { clearInterval(timeoutInterval); return; }
        try {
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await fetch(`${baseUrl}/api/cron/telemedicina-timeout`, {
            headers: process.env.CRON_SECRET ? { "x-cron-secret": process.env.CRON_SECRET } : {},
          });
        } catch { /* silencioso */ }
      }, 60000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        clearInterval(timeoutInterval);
        try { controller.close(); } catch { /* já fechado */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
