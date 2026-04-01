import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteChimeMeeting } from "@/lib/chime-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_INPROGRESS_MIN = 90; // sessão "in_progress" sem atividade → encerra após 90min
const TIMEOUT_WAITING_MIN = 30;    // sessão "waiting" sem médico entrar → cancela após 30min

// GET /api/cron/telemedicina-timeout
// Encerra sessões paradas há muito tempo e retorna médico ao status ONLINE.
// Protegido por CRON_SECRET. Pode ser chamado por Vercel Cron, GitHub Actions, etc.
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const agora = new Date();
  const limiteInProgress = new Date(agora.getTime() - TIMEOUT_INPROGRESS_MIN * 60 * 1000);
  const limiteWaiting = new Date(agora.getTime() - TIMEOUT_WAITING_MIN * 60 * 1000);

  // Sessões in_progress sem atividade por mais de 90min
  const sessoesInProgress = await prisma.telemedicineSession.findMany({
    where: {
      status: "in_progress",
      startedAt: { lt: limiteInProgress },
    },
    include: {
      consulta: { select: { id: true, medicoId: true } },
    },
  });

  // Sessões waiting sem médico entrar por mais de 30min
  const sessoesWaiting = await prisma.telemedicineSession.findMany({
    where: {
      status: { in: ["waiting", "scheduled"] },
      createdAt: { lt: limiteWaiting },
    },
    include: {
      consulta: { select: { id: true, medicoId: true } },
    },
  });

  const encerradas: string[] = [];
  const canceladas: string[] = [];

  // Encerrar sessões in_progress expiradas
  for (const sessao of sessoesInProgress) {
    try {
      if (sessao.meetingId) {
        try { await deleteChimeMeeting(sessao.meetingId); } catch { /* já expirou */ }
      }

      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: { status: "finished", finishedAt: agora },
      });

      await prisma.consulta.update({
        where: { id: sessao.consulta.id },
        data: { status: "REALIZADA", fimAtendimento: agora },
      });

      // Retorna médico ao status ONLINE
      await prisma.medicoTelemedicina.updateMany({
        where: { medicoId: sessao.consulta.medicoId },
        data: { status: "ONLINE" },
      });

      await prisma.telemedicineLog.create({
        data: {
          sessionId: sessao.id,
          eventType: "SESSION_ENDED",
          role: "DOCTOR",
          ipAddress: "cron",
          metadata: { motivo: "TIMEOUT_INATIVIDADE", timeoutMin: TIMEOUT_INPROGRESS_MIN },
        },
      });

      encerradas.push(sessao.id);
    } catch (err) {
      console.error(`[Cron] Erro ao encerrar sessão ${sessao.id}:`, err);
    }
  }

  // Cancelar sessões waiting sem médico
  for (const sessao of sessoesWaiting) {
    try {
      if (sessao.meetingId) {
        try { await deleteChimeMeeting(sessao.meetingId); } catch { /* já expirou */ }
      }

      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: { status: "cancelled", finishedAt: agora },
      });

      // Retorna médico ao status ONLINE caso esteja EM_ATENDIMENTO por esta sessão
      await prisma.medicoTelemedicina.updateMany({
        where: { medicoId: sessao.consulta.medicoId, status: "EM_ATENDIMENTO" },
        data: { status: "ONLINE" },
      });

      await prisma.telemedicineLog.create({
        data: {
          sessionId: sessao.id,
          eventType: "SESSION_ENDED",
          role: "PATIENT",
          ipAddress: "cron",
          metadata: { motivo: "TIMEOUT_SEM_MEDICO", timeoutMin: TIMEOUT_WAITING_MIN },
        },
      });

      canceladas.push(sessao.id);
    } catch (err) {
      console.error(`[Cron] Erro ao cancelar sessão ${sessao.id}:`, err);
    }
  }

  console.log(`[Cron] telemedicina-timeout: encerradas=${encerradas.length} canceladas=${canceladas.length}`);

  return NextResponse.json({
    ok: true,
    encerradas,
    canceladas,
    executadoEm: agora.toISOString(),
  });
}
