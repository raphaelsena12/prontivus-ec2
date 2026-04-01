import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { TipoUsuario } from "@/lib/generated/prisma";

// POST /api/paciente/telemedicina/sessao/[token]/cancelar
// Cancela a sessão e solicita reembolso ao Stripe (apenas se médico ainda não entrou)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { token } = await params;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { patientToken: token },
      include: {
        consulta: {
          select: {
            id: true,
            pacienteId: true,
            medicoId: true,
          },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    // Valida que é o próprio paciente
    let paciente = await prisma.paciente.findFirst({
      where: { usuarioId: session.user.id },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (!paciente && session.user.email) {
      paciente = await prisma.paciente.findFirst({
        where: { email: session.user.email, ativo: true },
        select: { id: true },
      });
    }
    if (!paciente || paciente.id !== sessao.consulta.pacienteId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Só permite cancelar se médico ainda não entrou (status waiting ou scheduled)
    if (sessao.status === "finished") {
      return NextResponse.json({ error: "Consulta já encerrada — não é possível cancelar." }, { status: 409 });
    }
    if (sessao.status === "cancelled") {
      return NextResponse.json({ error: "Sessão já foi cancelada." }, { status: 409 });
    }
    if (sessao.status === "in_progress") {
      return NextResponse.json(
        { error: "O médico já está na consulta. Para encerrar, aguarde o término do atendimento." },
        { status: 409 }
      );
    }

    // Busca o pagamento vinculado à consulta
    const pagamento = await prisma.pagamentoConsulta.findFirst({
      where: { consultaId: sessao.consulta.id, status: "PAGO" },
      select: { id: true, stripePaymentId: true, transacaoId: true, valor: true },
    });

    let reembolsoId: string | null = null;

    // Processa reembolso no Stripe se houver PaymentIntent registrado
    if (pagamento?.stripePaymentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: pagamento.stripePaymentId,
          reason: "requested_by_customer",
        });
        reembolsoId = refund.id;
        console.log(`[Cancelamento] Reembolso criado: ${refund.id} para PI: ${pagamento.stripePaymentId}`);
      } catch (stripeErr: any) {
        // Se já foi reembolsado ou outro erro do Stripe, não bloqueia o cancelamento
        console.error("[Cancelamento] Erro ao criar reembolso Stripe:", stripeErr?.message);
      }
    } else if (pagamento?.transacaoId) {
      // Fallback: usar transacaoId (pode ser o paymentIntentId salvo como transacaoId)
      try {
        const refund = await stripe.refunds.create({
          payment_intent: pagamento.transacaoId,
          reason: "requested_by_customer",
        });
        reembolsoId = refund.id;
      } catch (stripeErr: any) {
        console.error("[Cancelamento] Erro ao criar reembolso Stripe (fallback):", stripeErr?.message);
      }
    }

    const agora = new Date();

    // Atualiza sessão para cancelada
    await prisma.telemedicineSession.update({
      where: { id: sessao.id },
      data: { status: "cancelled", finishedAt: agora },
    });

    // Atualiza consulta
    await prisma.consulta.update({
      where: { id: sessao.consulta.id },
      data: { status: "CANCELADA", fimAtendimento: agora },
    });

    // Atualiza pagamento
    if (pagamento) {
      await prisma.pagamentoConsulta.update({
        where: { id: pagamento.id },
        data: {
          status: "CANCELADO",
          observacoes: reembolsoId
            ? `Cancelado pelo paciente — Reembolso Stripe: ${reembolsoId}`
            : "Cancelado pelo paciente — reembolso manual necessário",
        },
      });
    }

    // Retorna médico para ONLINE se estiver EM_ATENDIMENTO por esta sessão
    await prisma.medicoTelemedicina.updateMany({
      where: { medicoId: sessao.consulta.medicoId, status: "EM_ATENDIMENTO" },
      data: { status: "ONLINE" },
    });

    // Log
    await prisma.telemedicineLog.create({
      data: {
        sessionId: sessao.id,
        pacienteId: paciente.id,
        role: "PATIENT",
        eventType: "SESSION_ENDED",
        ipAddress: ip,
        metadata: {
          motivo: "CANCELADO_PELO_PACIENTE",
          reembolsoId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reembolsado: !!reembolsoId,
      reembolsoId,
      mensagem: reembolsoId
        ? "Consulta cancelada. O reembolso será processado em até 5 dias úteis."
        : "Consulta cancelada. Caso tenha sido cobrado, entre em contato com a clínica para o reembolso.",
    });
  } catch (error) {
    console.error("Erro ao cancelar sessão:", error);
    return NextResponse.json({ error: "Erro interno ao cancelar" }, { status: 500 });
  }
}
