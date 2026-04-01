import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";
import { createChimeMeeting } from "@/lib/chime-service";
import { sendEmailAsync, gerarEmailTelemedicinaNovoPackiente, gerarEmailTelemedicinaNovoPackienteTexto } from "@/lib/email";
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

    // 3. Buscar dados do médico
    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, ativo: true },
      include: {
        usuario: { select: { nome: true, email: true } },
        telemedicina: true,
      },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    // P0-1: Verificar se médico ainda está ONLINE no momento do processamento
    if (!medico.telemedicina || medico.telemedicina.status !== "ONLINE") {
      return NextResponse.json(
        { error: "O médico não está mais disponível para atendimento imediato. Por favor, escolha outro médico ou tente novamente." },
        { status: 409 }
      );
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

    // P0-2: Criar Consulta + vincular pagamento em transação atômica para evitar duplicação
    let consulta: Awaited<ReturnType<typeof prisma.consulta.create>>;
    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // Re-verifica dentro da transação para garantir atomicidade
        const pagamentoAtual = await tx.pagamentoConsulta.findUnique({
          where: { id: pagamentoId },
          select: { consultaId: true },
        });
        if (pagamentoAtual?.consultaId) {
          throw new Error("PAGAMENTO_JA_UTILIZADO");
        }

        const novaConsulta = await tx.consulta.create({
          data: {
            clinicaId,
            pacienteId: paciente!.id,
            medicoId,
            dataHora: agora,
            codigoTussId: codigoTuss!.id,
            tipoConsultaId: tipoConsulta?.id || null,
            modalidade: "TELEMEDICINA",
            status: "AGENDADA",
            inicioAtendimento: agora,
          },
        });

        await tx.pagamentoConsulta.update({
          where: { id: pagamentoId },
          data: {
            consultaId: novaConsulta.id,
            status: "PAGO",
            dataPagamento: agora,
            transacaoId: paymentIntentId,
            observacoes: `Telemedicina imediata - PaymentIntent: ${paymentIntentId}`,
          },
        });

        return novaConsulta;
      });
      consulta = resultado;
    } catch (txErr: any) {
      if (txErr?.message === "PAGAMENTO_JA_UTILIZADO") {
        return NextResponse.json({ error: "Pagamento já utilizado" }, { status: 400 });
      }
      throw txErr;
    }

    // 7. Criar TelemedicineSession — token válido por 4h (imediato não precisa de 24h)
    const patientToken = randomBytes(32).toString("hex");
    const patientTokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

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

    // 13. Email ao médico (assíncrono, não bloqueia a resposta)
    const medicoEmail = medico.usuario?.email;
    if (medicoEmail) {
      const sessionUrl = `${baseUrl}/medico/telemedicina/sessao/${sessao.id}`;
      const medicoNome = medico.usuario?.nome || "Médico";
      sendEmailAsync({
        to: medicoEmail,
        subject: `Novo paciente aguardando — ${paciente.nome}`,
        html: gerarEmailTelemedicinaNovoPackiente({
          medicoNome,
          pacienteNome: paciente.nome,
          sessionUrl,
          valor: medico.telemedicina!.valorConsulta as unknown as number,
        }),
        text: gerarEmailTelemedicinaNovoPackienteTexto({
          medicoNome,
          pacienteNome: paciente.nome,
          sessionUrl,
          valor: medico.telemedicina!.valorConsulta as unknown as number,
        }),
        fromName: "Prontivus",
      }).catch((err) => console.error("[Email] Falha ao notificar médico:", err));
    }

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
