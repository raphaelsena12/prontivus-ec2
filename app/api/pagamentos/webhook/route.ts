import { NextRequest, NextResponse } from "next/server";
import { confirmarPagamento } from "@/lib/pagamento-service";
import { StatusPagamento } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Webhook para receber confirmações de pagamento de gateways
 * Exemplos: Stripe, Mercado Pago, PagSeguro, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar autenticação do webhook (adicionar validação do gateway)
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Estrutura esperada do webhook (adaptar conforme seu gateway)
    const {
      pagamentoId,
      transacaoId,
      status,
      valor,
      dataPagamento,
    } = body;

    if (!pagamentoId || !transacaoId) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Buscar pagamento
    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
    });

    if (!pagamento) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    // Se o status do webhook indica pagamento confirmado
    if (status === "paid" || status === "approved" || status === "PAGO") {
      await confirmarPagamento(
        pagamentoId,
        transacaoId,
        dataPagamento ? new Date(dataPagamento) : undefined
      );

      return NextResponse.json({
        success: true,
        message: "Pagamento confirmado e licença renovada",
      });
    }

    // Se o pagamento foi cancelado ou reembolsado
    if (status === "cancelled" || status === "refunded") {
      await prisma.pagamento.update({
        where: { id: pagamentoId },
        data: {
          status:
            status === "cancelled"
              ? StatusPagamento.CANCELADO
              : StatusPagamento.REEMBOLSADO,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Status do pagamento atualizado",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook recebido",
    });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}















