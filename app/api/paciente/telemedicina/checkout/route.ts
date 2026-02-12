import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  medicoId: z.string().uuid(),
  dataHora: z.string(),
  valor: z.number().positive(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.PACIENTE) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas pacientes podem acessar." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      ),
    };
  }

  // Verificar se prisma.paciente está disponível
  if (!prisma.paciente) {
    console.error("[Checkout] prisma.paciente não está disponível");
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Erro interno do servidor - Prisma não inicializado" },
        { status: 500 }
      ),
    };
  }

  const paciente = await prisma.paciente.findFirst({
    where: {
      clinicaId: clinicaId,
      usuarioId: session.user.id,
    },
    select: { 
      id: true, 
      nome: true,
      usuario: {
        select: { email: true },
      },
    },
  });

  if (!paciente) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { 
    authorized: true, 
    clinicaId, 
    pacienteId: paciente.id, 
    pacienteNome: paciente.nome,
    pacienteEmail: paciente.usuario?.email || session.user.email,
  };
}

// POST /api/paciente/telemedicina/checkout
export async function POST(request: NextRequest) {
  try {
    // Verificar se Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[Checkout] STRIPE_SECRET_KEY não está configurada");
      return NextResponse.json(
        {
          error: "Serviço de pagamento não configurado",
          details: "As credenciais do Stripe não estão configuradas. Entre em contato com o suporte.",
        },
        { status: 503 }
      );
    }

    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { medicoId, dataHora, valor } = validation.data;

    // Verificar se o médico existe e pertence à mesma clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: medicoId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
      include: {
        usuario: {
          select: { nome: true },
        },
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado ou inativo" },
        { status: 404 }
      );
    }

    // Verificar se já existe um pagamento pendente para esta consulta
    const dataHoraDate = new Date(dataHora);
    const pagamentoExistente = await prisma.pagamentoConsulta.findFirst({
      where: {
        pacienteId: auth.pacienteId,
        status: "PENDENTE",
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Últimos 30 minutos
        },
      },
    });

    if (pagamentoExistente) {
      // Retornar a sessão existente se ainda estiver válida
      if (pagamentoExistente.stripeSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(
            pagamentoExistente.stripeSessionId
          );
          if (session.status === "open") {
            return NextResponse.json({
              sessionId: pagamentoExistente.stripeSessionId,
              url: session.url,
            });
          }
        } catch (error) {
          // Sessão expirada, continuar para criar nova
        }
      }
    }

    // Criar registro de pagamento pendente
    let pagamento;
    try {
      pagamento = await prisma.pagamentoConsulta.create({
        data: {
          clinicaId: auth.clinicaId,
          pacienteId: auth.pacienteId,
          valor: valor,
          status: "PENDENTE",
          metodoPagamento: "STRIPE",
          dataVencimento: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
          observacoes: `Pagamento para consulta de telemedicina - ${medico.usuario.nome} - ${new Date(dataHora).toLocaleString("pt-BR")}`,
        },
      });
      console.log("[Checkout] Pagamento criado:", pagamento.id);
    } catch (dbError: any) {
      console.error("[Checkout] Erro ao criar pagamento no banco:", {
        code: dbError?.code,
        message: dbError?.message,
        meta: dbError?.meta,
        error: dbError,
      });
      
      // Verificar se é erro de tabela não encontrada
      const errorMessage = dbError?.message || "";
      const errorCode = dbError?.code || "";
      
      if (
        errorCode === "P2021" || 
        errorCode === "42P01" ||
        errorMessage.includes("does not exist") || 
        errorMessage.includes("não existe") ||
        errorMessage.includes("relation") ||
        errorMessage.includes("table")
      ) {
        return NextResponse.json(
          {
            error: "Tabela de pagamentos não encontrada",
            details: "A tabela 'pagamentos_consultas' não existe no banco de dados. Execute a migration: npx prisma migrate deploy",
            code: errorCode,
          },
          { status: 500 }
        );
      }
      
      // Verificar outros erros comuns do Prisma
      if (errorCode === "P2002") {
        return NextResponse.json(
          {
            error: "Erro de duplicação",
            details: "Já existe um registro com esses dados. Tente novamente.",
            code: errorCode,
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          error: "Erro ao registrar pagamento",
          details: dbError instanceof Error ? dbError.message : "Erro ao salvar no banco de dados. Verifique se a migration foi executada.",
          code: errorCode || "UNKNOWN",
        },
        { status: 500 }
      );
    }

    // Criar sessão de checkout no Stripe
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    console.log("[Checkout] Criando sessão Stripe:", {
      pacienteId: auth.pacienteId,
      pacienteEmail: auth.pacienteEmail,
      medicoId,
      valor,
      dataHora,
      baseUrl,
    });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Consulta de Telemedicina",
                description: `Consulta com ${medico.usuario.nome} - ${new Date(dataHora).toLocaleString("pt-BR")}`,
              },
              unit_amount: Math.round(valor * 100), // Converter para centavos
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/paciente/pagamento?session_id={CHECKOUT_SESSION_ID}&success=true&medicoId=${medicoId}&dataHora=${encodeURIComponent(dataHora)}&valor=${valor}`,
        cancel_url: `${baseUrl}/paciente/pagamento?canceled=true&medicoId=${medicoId}&dataHora=${encodeURIComponent(dataHora)}&valor=${valor}&medicoNome=${encodeURIComponent(medico.usuario.nome)}&medicoEspecialidade=${encodeURIComponent(medico.especialidade || "")}`,
        metadata: {
          tipo: "TELEMEDICINA",
          pacienteId: auth.pacienteId,
          medicoId: medicoId,
          dataHora: dataHora,
          pagamentoId: pagamento.id,
          clinicaId: auth.clinicaId,
        },
        customer_email: auth.pacienteEmail || undefined,
      });

      console.log("[Checkout] Sessão criada com sucesso:", session.id);

      // Atualizar pagamento com sessionId
      await prisma.pagamentoConsulta.update({
        where: { id: pagamento.id },
        data: { stripeSessionId: session.id },
      });

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (stripeError) {
      console.error("[Checkout] Erro ao criar sessão Stripe:", stripeError);
      
      // Se falhar, atualizar status do pagamento para CANCELADO
      try {
        await prisma.pagamentoConsulta.update({
          where: { id: pagamento.id },
          data: { status: "CANCELADO" },
        });
      } catch (updateError) {
        console.error("[Checkout] Erro ao atualizar pagamento:", updateError);
      }

      const errorMessage = stripeError instanceof Error ? stripeError.message : "Erro desconhecido do Stripe";
      return NextResponse.json(
        {
          error: "Erro ao criar sessão de pagamento no Stripe",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Checkout] Erro geral ao criar checkout:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      error,
    });
    
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorCode = error?.code || "UNKNOWN";
    
    return NextResponse.json(
      {
        error: "Erro ao criar sessão de pagamento",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}
