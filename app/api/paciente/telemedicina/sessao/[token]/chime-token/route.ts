import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createChimeAttendee } from "@/lib/chime-service";
import { sendEmailAsync, gerarEmailTelemedicinaNovoPackiente, gerarEmailTelemedicinaNovoPackienteTexto } from "@/lib/email";

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
        consulta: {
          select: {
            pacienteId: true,
            paciente: { select: { nome: true } },
            medico: {
              select: {
                id: true,
                usuario: { select: { nome: true, email: true } },
                telemedicina: { select: { valorConsulta: true } },
              },
            },
          },
        },
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
    // Se a reunião expirou no AWS (NotFoundException), retorna 503 para o paciente aguardar
    // o médico reentrar (que recriará a reunião automaticamente).
    let attendee: Awaited<ReturnType<typeof createChimeAttendee>>;
    try {
      attendee = await createChimeAttendee(
        sessao.meetingId,
        `PATIENT_${sessao.consulta.pacienteId}`
      );
    } catch (err: any) {
      const isNotFound =
        err?.name === "NotFoundException" ||
        err?.$metadata?.httpStatusCode === 404 ||
        err?.message?.toLowerCase().includes("not found");

      if (isNotFound) {
        console.warn("[Chime/Paciente] Reunião expirada, médico precisa reconectar.", {
          sessionId: sessao.id,
          meetingId: sessao.meetingId,
        });
        return NextResponse.json(
          { error: "Sala de vídeo expirou. Aguarde o médico reconectar." },
          { status: 503 }
        );
      }
      throw err;
    }

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
    const eraScheduled = sessao.status === "scheduled";
    if (eraScheduled) {
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: { status: "waiting" },
      });

      // Notifica médico por email quando paciente entra na sala de espera (sessão agendada)
      const medicoEmail = sessao.consulta.medico?.usuario?.email;
      if (medicoEmail) {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const sessionUrl = `${baseUrl}/medico/telemedicina/sessao/${sessao.id}`;
        const medicoNome = sessao.consulta.medico?.usuario?.nome || "Médico";
        const pacienteNome = sessao.consulta.paciente?.nome || "Paciente";
        const valor = (sessao.consulta.medico?.telemedicina?.valorConsulta as unknown as number) || 0;
        sendEmailAsync({
          to: medicoEmail,
          subject: `Paciente aguardando na sala — ${pacienteNome}`,
          html: gerarEmailTelemedicinaNovoPackiente({ medicoNome, pacienteNome, sessionUrl, valor }),
          text: gerarEmailTelemedicinaNovoPackienteTexto({ medicoNome, pacienteNome, sessionUrl, valor }),
          fromName: "Prontivus",
        }).catch((err) => console.error("[Email] Falha ao notificar médico (chime-token):", err));
      }
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
