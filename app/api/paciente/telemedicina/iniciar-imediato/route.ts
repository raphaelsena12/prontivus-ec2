import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";
import { createChimeMeeting } from "@/lib/chime-service";
import { z } from "zod";

const schema = z.object({
  paymentIntentId: z.string(),
  pagamentoId: z.string().uuid(),
  medicoId: z.string().uuid(),
  medicoTelemedicinaId: z.string().uuid(),
});

// POST /api/paciente/telemedicina/iniciar-imediato
// Após pagamento confirmado: cria Consulta + TelemedicineSession + Chime
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Busca paciente pelo usuarioId (sem filtro de clinicaId)
    let paciente = await prisma.paciente.findFirst({
      where: { usuarioId: session.user.id },
      select: { id: true, nome: true, cpf: true, email: true, clinicaId: true },
      orderBy: { id: "asc" },
    });

    // Fallback por email
    if (!paciente && session.user.email) {
      paciente = await prisma.paciente.findFirst({
        where: { email: session.user.email, ativo: true },
        select: { id: true, nome: true, cpf: true, email: true, clinicaId: true },
      });
    }

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { paymentIntentId, pagamentoId, medicoId, medicoTelemedicinaId } = validation.data;

    // 1. Verificar pagamento no Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Pagamento não confirmado pelo Stripe" },
        { status: 402 }
      );
    }

    // 2. Verificar o PagamentoConsulta no banco
    const pagamento = await prisma.pagamentoConsulta.findUnique({
      where: { id: pagamentoId },
    });
    if (!pagamento || pagamento.pacienteId !== paciente.id) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    if (pagamento.consultaId) {
      return NextResponse.json({ error: "Pagamento já utilizado" }, { status: 400 });
    }

    // 3. Buscar dados do médico (sem filtrar por clinicaId do paciente — suporte cross-clinic)
    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, ativo: true },
      include: {
        usuario: { select: { nome: true } },
        telemedicina: true,
      },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    // Usar a clínica do médico para a Consulta
    const clinicaId = medico.clinicaId;

    // 4. Buscar tipoConsulta TELEMEDICINA e codigoTuss
    const tipoConsulta = await prisma.tipoConsulta.findFirst({
      where: { codigo: "TELEMEDICINA", ativo: true },
    });

    let codigoTuss = await prisma.codigoTuss.findFirst({
      where: { ativo: true, descricao: { contains: "CONSULTA", mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });
    if (!codigoTuss) {
      codigoTuss = await prisma.codigoTuss.findFirst({
        where: { ativo: true },
        orderBy: { createdAt: "asc" },
      });
    }
    if (!codigoTuss) {
      return NextResponse.json({ error: "Código TUSS não configurado na clínica" }, { status: 500 });
    }

    const agora = new Date();

    // 5. Criar Consulta na clínica do médico
    const consulta = await prisma.consulta.create({
      data: {
        clinicaId,
        pacienteId: paciente.id,
        medicoId,
        dataHora: agora,
        codigoTussId: codigoTuss.id,
        tipoConsultaId: tipoConsulta?.id || null,
        modalidade: "TELEMEDICINA",
        status: "AGENDADA",
        inicioAtendimento: agora,
      },
    });

    // 6. Vincular pagamento à consulta e marcar como PAGO
    await prisma.pagamentoConsulta.update({
      where: { id: pagamentoId },
      data: {
        consultaId: consulta.id,
        status: "PAGO",
        dataPagamento: agora,
        transacaoId: paymentIntentId,
        observacoes: `Telemedicina imediata - PaymentIntent: ${paymentIntentId}`,
      },
    });

    // 7. Criar TelemedicineSession
    const patientToken = randomBytes(32).toString("hex");
    const patientTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const sessao = await prisma.telemedicineSession.create({
      data: {
        consultaId: consulta.id,
        status: "waiting",
        patientToken,
        patientTokenExpiresAt,
        identityVerifiedAt: agora, // Paciente autenticado — identity já verificada
      },
    });

    // 8. Criar reunião Chime
    try {
      const meetingData = await createChimeMeeting(sessao.id);
      await prisma.telemedicineSession.update({
        where: { id: sessao.id },
        data: {
          meetingId: meetingData.MeetingId,
          meetingData: meetingData as any,
        },
      });
    } catch (chimeErr) {
      console.error("Erro ao criar reunião Chime:", chimeErr);
      // Continua — Chime será criado quando o médico entrar
    }

    // 9. Criar participantes
    await prisma.telemedicineParticipant.createMany({
      data: [
        { sessionId: sessao.id, medicoId, role: "DOCTOR" },
        { sessionId: sessao.id, pacienteId: paciente.id, role: "PATIENT" },
      ],
    });

    // 10. Auto-consent LGPD (paciente autenticado e pagou)
    await prisma.telemedicineConsent.create({
      data: {
        sessionId: sessao.id,
        pacienteId: paciente.id,
        consentGiven: true,
        consentVersion: "1.0",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "",
        consentTimestamp: agora,
      },
    });

    // 11. Logs
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    await prisma.telemedicineLog.createMany({
      data: [
        {
          sessionId: sessao.id,
          pacienteId: paciente.id,
          role: "PATIENT",
          eventType: "SESSION_CREATED",
          ipAddress: ip,
          metadata: { consultaId: consulta.id, via: "TELEMEDICINA_IMEDIATA" },
        },
        {
          sessionId: sessao.id,
          pacienteId: paciente.id,
          role: "PATIENT",
          eventType: "PATIENT_JOINED",
          ipAddress: ip,
          metadata: { via: "TELEMEDICINA_IMEDIATA" },
        },
      ],
    });

    // 12. Atualizar status do médico para EM_ATENDIMENTO
    await prisma.medicoTelemedicina.update({
      where: { id: medicoTelemedicinaId },
      data: { status: "EM_ATENDIMENTO" },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const patientLink = `${baseUrl}/telemedicina/acesso?token=${patientToken}`;

    return NextResponse.json({
      sessionId: sessao.id,
      consultaId: consulta.id,
      patientToken,
      patientLink,
    });
  } catch (error) {
    console.error("Erro ao iniciar telemedicina imediata:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
