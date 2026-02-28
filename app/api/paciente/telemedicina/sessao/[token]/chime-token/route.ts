import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createChimeAttendee } from "@/lib/chime-service";

// GET /api/paciente/telemedicina/sessao/[token]/chime-token
// Rota PÚBLICA — retorna as credenciais Chime para o paciente entrar na sala
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { patientToken: token },
      include: {
        consulta: { select: { pacienteId: true } },
        consents: { where: { consentGiven: true }, take: 1 },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    if (new Date() > sessao.patientTokenExpiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    if (["finished", "cancelled"].includes(sessao.status)) {
      return NextResponse.json({ error: "Sessão encerrada" }, { status: 410 });
    }

    // Verifica pré-requisitos
    if (!sessao.identityVerifiedAt) {
      return NextResponse.json(
        { error: "Validação de identidade não realizada" },
        { status: 403 }
      );
    }

    if (sessao.consents.length === 0) {
      return NextResponse.json(
        { error: "Consentimento LGPD não registrado" },
        { status: 403 }
      );
    }

    if (!sessao.meetingId || !sessao.meetingData) {
      return NextResponse.json(
        { error: "Sala de vídeo ainda não está disponível. Aguarde o médico iniciar a consulta." },
        { status: 503 }
      );
    }

    // Cria attendee do paciente no Chime
    const attendee = await createChimeAttendee(
      sessao.meetingId,
      `PATIENT_${sessao.consulta.pacienteId}`
    );

    // Atualiza participante paciente
    await prisma.telemedicineParticipant.updateMany({
      where: {
        sessionId: sessao.id,
        pacienteId: sessao.consulta.pacienteId,
        role: "PATIENT",
      },
      data: {
        attendeeId: attendee.AttendeeId,
        attendeeData: attendee as any,
        joinTime: new Date(),
      },
    });

    // Atualiza status para waiting (paciente entrou, aguardando médico)
    if (sessao.status === "scheduled") {
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: { status: "waiting" },
      });
    }

    // Registra log
    await prisma.telemedicineLog.create({
      data: {
        sessionId: sessao.id,
        pacienteId: sessao.consulta.pacienteId,
        role: "PATIENT",
        eventType: "PATIENT_JOINED",
        ipAddress: ip,
        metadata: { attendeeId: attendee.AttendeeId },
      },
    });

    return NextResponse.json({
      Meeting: sessao.meetingData,
      Attendee: attendee,
    });
  } catch (error) {
    console.error("Erro ao obter token Chime para paciente:", error);
    return NextResponse.json({ error: "Erro ao conectar à sala de vídeo" }, { status: 500 });
  }
}
