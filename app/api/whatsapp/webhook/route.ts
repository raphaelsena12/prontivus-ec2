import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WhatsAppWebhookEntry } from "@/lib/whatsapp";

/**
 * GET /api/whatsapp/webhook
 * Verificação do webhook (challenge do Meta)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verificado com sucesso");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("❌ Falha na verificação do webhook");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Recebe eventos do WhatsApp (mensagens recebidas, status de entrega, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: WhatsAppWebhookEntry[] = body.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes) {
        const value = change.value;

        // Identificar a clínica pelo phoneNumberId do metadata
        const phoneNumberId = value.metadata?.phone_number_id;
        const clinicaId = phoneNumberId
          ? await resolveClinicaByPhoneNumberId(phoneNumberId)
          : null;

        if (value.messages) {
          for (const message of value.messages) {
            await processIncomingMessage(message, value, clinicaId);
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            await processMessageStatus(status);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao processar webhook WhatsApp:", error);
    // Sempre retornar 200 para evitar retentativas excessivas do Meta
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

/**
 * Resolve clinicaId a partir do phoneNumberId configurado no banco
 */
async function resolveClinicaByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const clinica = await prisma.tenant.findFirst({
    where: { whatsappPhoneNumberId: phoneNumberId },
    select: { id: true },
  });
  return clinica?.id ?? null;
}

/**
 * Processa mensagem recebida
 */
async function processIncomingMessage(message: any, value: any, clinicaId: string | null) {
  try {
    const from = message.from;
    const messageText = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "";

    console.log(`📨 Mensagem recebida de ${from}: ${messageText}`);

    const telefoneFormatado = from.replace(/\D/g, "");
    const ultimosNoveDigitos = telefoneFormatado.slice(-9);

    // Buscar paciente pelo celular ou telefone
    const whereClause: any = {
      OR: [
        { celular: { contains: ultimosNoveDigitos } },
        { telefone: { contains: ultimosNoveDigitos } },
      ],
    };
    if (clinicaId) {
      whereClause.clinicaId = clinicaId;
    }

    const paciente = await prisma.paciente.findFirst({
      where: whereClause,
      include: {
        clinica: true,
        consultas: {
          where: {
            status: { in: ["AGENDADA", "CONFIRMADA"] },
            dataHora: { gte: new Date() },
          },
          include: {
            medico: { include: { usuario: true } },
          },
          orderBy: { dataHora: "asc" },
          take: 1,
        },
      },
    });

    if (!paciente) {
      console.log(`⚠️ Paciente não encontrado para o número ${from}`);
      return;
    }

    const consulta = paciente.consultas[0];

    // Processar resposta de confirmação/cancelamento
    const resposta = messageText.trim();
    if (consulta && (resposta === "1" || /^(sim|confirmo|confirmar)/i.test(resposta))) {
      await prisma.consulta.update({
        where: { id: consulta.id },
        data: { status: "CONFIRMADA" },
      });
      console.log(`✅ Consulta ${consulta.id} confirmada pelo paciente ${paciente.nome}`);
    } else if (consulta && (resposta === "2" || /^(não|nao|cancelar|cancelo)/i.test(resposta))) {
      await prisma.consulta.update({
        where: { id: consulta.id },
        data: { status: "CANCELADA" },
      });
      console.log(`❌ Consulta ${consulta.id} cancelada pelo paciente ${paciente.nome}`);
    }

    let medicoId: string | undefined = consulta?.medicoId;

    if (!medicoId) {
      const medico = await prisma.medico.findFirst({
        where: { clinicaId: paciente.clinicaId, ativo: true },
      });
      medicoId = medico?.id;
    }

    if (!medicoId) {
      console.log(`⚠️ Médico não encontrado para a clínica ${paciente.clinicaId}`);
      return;
    }

    await prisma.mensagem.create({
      data: {
        clinicaId: paciente.clinicaId,
        medicoId,
        pacienteId: paciente.id,
        conteudo: messageText,
        enviadoPorMedico: false,
        lida: false,
      },
    });

    console.log("✅ Mensagem salva no banco de dados");
  } catch (error) {
    console.error("Erro ao processar mensagem recebida:", error);
  }
}

/**
 * Processa status de mensagem enviada (entregue, lida, etc.)
 */
async function processMessageStatus(status: any) {
  try {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    console.log(`📊 Status da mensagem ${messageId}: ${statusType}`);
  } catch (error) {
    console.error("Erro ao processar status da mensagem:", error);
  }
}
