import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/whatsapp/send
 * Envia uma mensagem via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, message, templateId, templateParams, pacienteId, clinicaId } = body;

    // Validações
    if (!to) {
      return NextResponse.json(
        { error: "Número de telefone (to) é obrigatório" },
        { status: 400 }
      );
    }

    if (!message && !templateId) {
      return NextResponse.json(
        { error: "Mensagem ou templateId é obrigatório" },
        { status: 400 }
      );
    }

    // Enviar mensagem
    let result;
    if (templateId) {
      result = await sendWhatsAppTemplate({
        to,
        message: "", // Não usado em templates, mas requerido pela interface
        templateId,
        templateParams,
      });
    } else {
      result = await sendWhatsAppMessage({
        to,
        message,
      });
    }

    // Salvar no banco de dados se pacienteId e clinicaId foram fornecidos
    if (pacienteId && clinicaId && result.messages?.[0]?.id) {
      try {
        // Buscar médico associado ao usuário
        const usuario = await prisma.usuario.findUnique({
          where: { id: session.user.id },
          include: {
            medicos: {
              where: { clinicaId },
              take: 1,
            },
          },
        });

        const medico = usuario?.medicos[0];

        if (medico) {
          await prisma.mensagem.create({
            data: {
              clinicaId,
              medicoId: medico.id,
              pacienteId,
              conteudo: message || `Template: ${templateId}`,
              enviadoPorMedico: true,
              lida: false,
            },
          });
        }
      } catch (dbError) {
        console.error("Erro ao salvar mensagem no banco:", dbError);
        // Não falhar a requisição se houver erro ao salvar no banco
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.messages[0]?.id,
      data: result,
    });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao enviar mensagem WhatsApp" },
      { status: 500 }
    );
  }
}
