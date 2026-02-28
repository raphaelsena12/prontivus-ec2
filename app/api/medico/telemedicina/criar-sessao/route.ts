import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { createChimeMeeting } from "@/lib/chime-service";
import { sendEmail, gerarEmailTelemedicinalink, gerarEmailTelemedicinalinkTexto } from "@/lib/email";

// POST /api/medico/telemedicina/criar-sessao
// Cria uma sessão de telemedicina vinculada a uma consulta e envia o link ao paciente
export async function POST(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { consultaId } = body;

    if (!consultaId) {
      return NextResponse.json({ error: "consultaId é obrigatório" }, { status: 400 });
    }

    // Verifica que a consulta existe, pertence ao médico e é telemedicina
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
      },
      include: {
        paciente: { select: { id: true, nome: true, email: true, cpf: true } },
        clinica: { select: { nome: true } },
        medico: {
          select: {
            usuario: { select: { nome: true } },
            especialidade: true,
          },
        },
      },
    });

    if (!consulta) {
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    if (consulta.modalidade !== "TELEMEDICINA") {
      return NextResponse.json(
        { error: "Esta consulta não é do tipo Telemedicina" },
        { status: 400 }
      );
    }

    // Verifica se já existe uma sessão ativa para esta consulta
    const sessaoExistente = await prisma.telemedicineSession.findUnique({
      where: { consultaId },
    });

    if (sessaoExistente && !["finished", "cancelled"].includes(sessaoExistente.status)) {
      return NextResponse.json({
        sessionId: sessaoExistente.id,
        status: sessaoExistente.status,
        patientLink: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/telemedicina/acesso?token=${sessaoExistente.patientToken}`,
        message: "Sessão já existe",
      });
    }

    // Gera token do paciente (válido por 24h)
    const patientToken = randomBytes(32).toString("hex");
    const patientTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Cria sessão no banco primeiro (para ter o sessionId)
    const sessao = await prisma.telemedicineSession.create({
      data: {
        consultaId,
        status: "scheduled",
        patientToken,
        patientTokenExpiresAt,
      },
    });

    // Cria reunião no AWS Chime
    let meetingData: any = null;
    try {
      meetingData = await createChimeMeeting(sessao.id);
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: {
          meetingId: meetingData.MeetingId,
          meetingData: meetingData as any,
        },
      });
    } catch (chimeError) {
      console.error("Erro ao criar reunião Chime:", chimeError);
      // Continua sem o Chime por enquanto; o token será criado quando o médico entrar
    }

    // Cria participante médico
    await prisma.telemedicineParticipant.create({
      data: {
        sessionId: sessao.id,
        medicoId: auth.medicoId,
        role: "DOCTOR",
      },
    });

    // Cria participante paciente
    await prisma.telemedicineParticipant.create({
      data: {
        sessionId: sessao.id,
        pacienteId: consulta.pacienteId,
        role: "PATIENT",
      },
    });

    // Registra log de criação
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await prisma.telemedicineLog.create({
      data: {
        sessionId: sessao.id,
        medicoId: auth.medicoId,
        role: "DOCTOR",
        eventType: "SESSION_CREATED",
        ipAddress: ip,
        metadata: { consultaId, meetingId: meetingData?.MeetingId || null },
      },
    });

    // Gera o link do paciente
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const patientLink = `${baseUrl}/telemedicina/acesso?token=${patientToken}`;

    // Envia e-mail ao paciente (sem bloquear a resposta)
    const medicoNome = consulta.medico?.usuario?.nome || "Médico";
    const especialidade = consulta.medico?.especialidade || undefined;
    const pacienteEmail = consulta.paciente.email;
    const pacienteNome = consulta.paciente.nome;
    const clinicaNome = consulta.clinica?.nome;

    if (pacienteEmail) {
      const html = gerarEmailTelemedicinalink({
        pacienteNome,
        medicoNome,
        especialidade,
        dataHora: consulta.dataHora,
        clinicaNome,
        accessLink: patientLink,
        baseUrl,
      });
      const texto = gerarEmailTelemedicinalinkTexto({
        pacienteNome,
        medicoNome,
        especialidade,
        dataHora: consulta.dataHora,
        clinicaNome,
        accessLink: patientLink,
        baseUrl,
      });

      sendEmail({
        to: pacienteEmail,
        subject: `Sua consulta online com Dr(a). ${medicoNome} - Prontivus`,
        html,
        text: texto,
        fromName: "Prontivus Telemedicina",
      }).then(async () => {
        await prisma.telemedicineLog.create({
          data: {
            sessionId: sessao.id,
            pacienteId: consulta.pacienteId,
            role: "PATIENT",
            eventType: "PATIENT_LINK_SENT",
            metadata: { email: pacienteEmail },
          },
        });
      }).catch((err) => {
        console.error("Erro ao enviar e-mail de telemedicina:", err);
      });
    }

    return NextResponse.json({
      sessionId: sessao.id,
      status: "scheduled",
      patientLink,
      meetingId: meetingData?.MeetingId || null,
    });
  } catch (error) {
    console.error("Erro ao criar sessão de telemedicina:", error);
    return NextResponse.json({ error: "Erro interno ao criar sessão" }, { status: 500 });
  }
}
