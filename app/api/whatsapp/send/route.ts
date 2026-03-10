import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsAppForClinica, getClinicaWhatsAppService } from "@/lib/whatsapp";
import { checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/whatsapp/send
 * Envia uma mensagem via WhatsApp usando as credenciais da clínica
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e obter clinicaId da sessão
    const auth = await checkClinicaAuth();
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { to, message, templateId, templateParams, pacienteId } = body;

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

    // Validar formato do número (deve ter pelo menos 10 dígitos)
    const numeroLimpo = to.replace(/\D/g, "");
    if (numeroLimpo.length < 10) {
      return NextResponse.json(
        { error: "Número de telefone inválido. Deve ter pelo menos 10 dígitos." },
        { status: 400 }
      );
    }

    // Enviar mensagem usando as credenciais da clínica
    let result;
    if (templateId) {
      // Para templates, usar o service diretamente
      const service = await getClinicaWhatsAppService(auth.clinicaId!);
      if (!service) {
        return NextResponse.json(
          { error: "WhatsApp não configurado para esta clínica" },
          { status: 400 }
        );
      }
      result = await service.sendTemplateMessage({
        to,
        message: "", // Não usado em templates
        templateId,
        templateParams: templateParams || [],
      });
    } else {
      // Para mensagens de texto, usar sendWhatsAppForClinica
      try {
        result = await sendWhatsAppForClinica(auth.clinicaId!, {
          to,
          message,
        });
      } catch (waError: any) {
        // Se o erro for de número não autorizado, retornar erro específico
        if (waError.message?.includes("não autorizado") || waError.message?.includes("not in allowed list")) {
          return NextResponse.json(
            { 
              error: "Número de telefone não autorizado. No modo sandbox, adicione o número na lista de permissões do Meta e faça opt-in enviando 'join [código]' para o número de teste.",
            },
            { status: 400 }
          );
        }
        throw waError; // Relançar outros erros
      }
    }

    // Se não foi enviado (retornou null), significa que WhatsApp não está configurado
    if (!result) {
      return NextResponse.json(
        { 
          error: "WhatsApp não configurado para esta clínica. Configure as credenciais em Configurações → WhatsApp Business API.",
        },
        { status: 400 }
      );
    }

    // Salvar no banco de dados se pacienteId foi fornecido
    if (pacienteId && result.messages?.[0]?.id) {
      try {
        const session = await getServerSession(authOptions);
        // Buscar médico associado ao usuário
        const usuario = await prisma.usuario.findUnique({
          where: { id: session?.user?.id },
          include: {
            medicos: {
              where: { clinicaId: auth.clinicaId },
              take: 1,
            },
          },
        });

        const medico = usuario?.medicos[0];

        if (medico) {
          await prisma.mensagem.create({
            data: {
              clinicaId: auth.clinicaId!,
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
    
    // Verificar se é erro de número não autorizado
    if (error.message?.includes("não autorizado") || error.message?.includes("not in allowed list")) {
      return NextResponse.json(
        { 
          error: error.message || "Número de telefone não autorizado. No modo sandbox, adicione o número na lista de permissões do Meta e faça opt-in.",
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Erro ao enviar mensagem WhatsApp" },
      { status: 500 }
    );
  }
}
