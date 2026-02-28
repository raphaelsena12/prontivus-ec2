import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { createChimeMeeting, createChimeAttendee } from "@/lib/chime-service";

// GET /api/medico/telemedicina/sessoes/[sessionId]/chime-token
// Retorna as credenciais Chime para o médico entrar na sala de vídeo
export async function GET(
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
        consulta: { select: { clinicaId: true, medicoId: true } },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (sessao.consulta.clinicaId !== auth.clinicaId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (["finished", "cancelled"].includes(sessao.status)) {
      return NextResponse.json({ error: "Esta sessão já foi encerrada" }, { status: 410 });
    }

    // Se não tem reunião Chime ainda, cria agora
    let meetingData = sessao.meetingData as any;
    if (!meetingData || !meetingData.MeetingId) {
      const meeting = await createChimeMeeting(sessao.id);
      meetingData = meeting;
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: {
          meetingId: meeting.MeetingId,
          meetingData: meeting as any,
        },
      });
    }

    // Cria o attendee do médico no Chime
    const attendee = await createChimeAttendee(
      meetingData.MeetingId,
      `DOCTOR_${auth.medicoId}`
    );

    // Atualiza o participante médico com os dados do attendee
    await prisma.telemedicineParticipant.updateMany({
      where: { sessionId, medicoId: auth.medicoId, role: "DOCTOR" },
      data: {
        attendeeId: attendee.AttendeeId,
        attendeeData: attendee as any,
        joinTime: new Date(),
      },
    });

    // Atualiza status da sessão para in_progress
    await prisma.telemedicineSession.update({
      where: { id: sessao.id },
      data: {
        status: "in_progress",
        startedAt: sessao.startedAt || new Date(),
      },
    });

    // Registra logs
    await prisma.telemedicineLog.createMany({
      data: [
        {
          sessionId,
          medicoId: auth.medicoId,
          role: "DOCTOR",
          eventType: "DOCTOR_JOINED",
          ipAddress: ip,
          metadata: { attendeeId: attendee.AttendeeId },
        },
        {
          sessionId,
          medicoId: auth.medicoId,
          role: "DOCTOR",
          eventType: "SESSION_STARTED",
          ipAddress: ip,
        },
      ],
    });

    return NextResponse.json({
      Meeting: meetingData,
      Attendee: attendee,
    });
  } catch (error) {
    console.error("Erro ao obter token Chime para médico:", error);
    return NextResponse.json({ error: "Erro ao conectar à sala de vídeo" }, { status: 500 });
  }
}
