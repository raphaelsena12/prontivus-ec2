import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { deleteChimeMeeting } from "@/lib/chime-service";

// POST /api/medico/telemedicina/sessoes/[sessionId]/encerrar
// Encerra a sessão de telemedicina e finaliza a consulta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { sessionId } = await params;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { id: sessionId },
      include: {
        consulta: { select: { id: true, clinicaId: true, inicioAtendimento: true } },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (sessao.consulta.clinicaId !== auth.clinicaId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (sessao.status === "finished" || sessao.status === "cancelled") {
      return NextResponse.json({ message: "Sessão já encerrada" });
    }

    const agora = new Date();

    // Encerra a reunião no AWS Chime
    if (sessao.meetingId) {
      try {
        await deleteChimeMeeting(sessao.meetingId);
      } catch (err) {
        // Loga mas não bloqueia (reunião pode já ter expirado)
        console.warn("Aviso ao deletar reunião Chime:", err);
      }
    }

    // Calcula duração em segundos
    const duracaoSegundos = sessao.startedAt
      ? Math.floor((agora.getTime() - sessao.startedAt.getTime()) / 1000)
      : 0;

    // Atualiza sessão para finished
    await prisma.telemedicineSession.update({
      where: { id: sessao.id },
      data: { status: "finished", finishedAt: agora },
    });

    // Atualiza leave time do médico
    await prisma.telemedicineParticipant.updateMany({
      where: { sessionId, medicoId: auth.medicoId, role: "DOCTOR" },
      data: { leaveTime: agora },
    });

    // Finaliza a consulta
    await prisma.consulta.update({
      where: { id: sessao.consultaId },
      data: {
        status: "REALIZADA",
        fimAtendimento: agora,
      },
    });

    // Registra log de encerramento
    await prisma.telemedicineLog.create({
      data: {
        sessionId,
        medicoId: auth.medicoId,
        role: "DOCTOR",
        eventType: "SESSION_ENDED",
        ipAddress: ip,
        metadata: { duracaoSegundos, finishedAt: agora.toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      duracaoSegundos,
      finishedAt: agora.toISOString(),
    });
  } catch (error) {
    console.error("Erro ao encerrar sessão de telemedicina:", error);
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
