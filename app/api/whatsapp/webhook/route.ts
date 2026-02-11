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

  // Verificar se o token corresponde
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

    // O webhook do Meta envia os dados em body.entry
    const entries: WhatsAppWebhookEntry[] = body.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes) {
        const value = change.value;

        // Processar mensagens recebidas
        if (value.messages) {
          for (const message of value.messages) {
            await processIncomingMessage(message, value);
          }
        }

        // Processar status de mensagens enviadas
        if (value.statuses) {
          for (const status of value.statuses) {
            await processMessageStatus(status);
          }
        }
      }
    }

    // Sempre retornar 200 para o Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao processar webhook WhatsApp:", error);
    // Sempre retornar 200 para evitar retentativas excessivas do Meta
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

/**
 * Processa mensagem recebida
 */
async function processIncomingMessage(
  message: any,
  value: any
) {
  try {
    const from = message.from; // Número do remetente
    const messageText = message.text?.body || "";
    const messageId = message.id;
    const timestamp = parseInt(message.timestamp);

    console.log(`📨 Mensagem recebida de ${from}: ${messageText}`);

    // Buscar paciente pelo telefone
    const telefoneFormatado = from.replace(/\D/g, "");
    
    const paciente = await prisma.paciente.findFirst({
      where: {
        telefone: {
          contains: telefoneFormatado.slice(-9), // Últimos 9 dígitos (sem código do país)
        },
      },
      include: {
        clinica: true,
        consultas: {
          where: {
            status: {
              in: ["AGENDADA", "EM_ANDAMENTO"],
            },
          },
          include: {
            medico: {
              include: {
                usuario: true,
              },
            },
          },
          orderBy: {
            dataHora: "desc",
          },
          take: 1,
        },
      },
    });

    if (!paciente) {
      console.log(`⚠️ Paciente não encontrado para o número ${from}`);
      // Aqui você pode implementar lógica para criar um novo contato ou responder automaticamente
      return;
    }

    // Buscar médico da última consulta ou médico padrão da clínica
    const consulta = paciente.consultas[0];
    let medicoId: string | undefined = consulta?.medicoId;

    if (!medicoId) {
      // Buscar primeiro médico ativo da clínica
      const medico = await prisma.medico.findFirst({
        where: {
          clinicaId: paciente.clinicaId,
          ativo: true,
        },
      });
      medicoId = medico?.id;
    }

    if (!medicoId) {
      console.log(`⚠️ Médico não encontrado para a clínica ${paciente.clinicaId}`);
      return;
    }

    // Salvar mensagem no banco
    await prisma.mensagem.create({
      data: {
        clinicaId: paciente.clinicaId,
        medicoId,
        pacienteId: paciente.id,
        conteudo: messageText,
        enviadoPorMedico: false, // Mensagem veio do paciente
        lida: false,
      },
    });

    console.log(`✅ Mensagem salva no banco de dados`);
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
    const recipientId = status.recipient_id;

    console.log(`📊 Status da mensagem ${messageId}: ${statusType}`);

    // Aqui você pode atualizar o status da mensagem no banco se necessário
    // Por exemplo, marcar como entregue quando status === "delivered"
    
    // Buscar mensagem pelo ID externo (se você armazenar)
    // await prisma.mensagem.updateMany({
    //   where: { whatsappMessageId: messageId },
    //   data: { status: statusType },
    // });
  } catch (error) {
    console.error("Erro ao processar status da mensagem:", error);
  }
}
