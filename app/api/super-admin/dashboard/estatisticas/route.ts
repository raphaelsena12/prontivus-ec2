import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusPagamento } from "@/lib/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Buscar estatísticas de pagamentos (similar à página de pagamentos)
    const [
      totalPagamentos,
      pagamentosPendentes,
      pagamentosPagos,
      pagamentosVencidos,
      receitaMesAtual,
      receitaTotal,
    ] = await Promise.all([
      // Total de pagamentos
      prisma.pagamento.count(),
      // Pagamentos pendentes
      prisma.pagamento.count({
        where: { status: StatusPagamento.PENDENTE },
      }),
      // Pagamentos pagos
      prisma.pagamento.count({
        where: { status: StatusPagamento.PAGO },
      }),
      // Pagamentos vencidos
      prisma.pagamento.count({
        where: {
          status: StatusPagamento.PENDENTE,
          dataVencimento: {
            lt: hoje,
          },
        },
      }),
      // Receita do mês atual
      prisma.pagamento.aggregate({
        where: {
          status: StatusPagamento.PAGO,
          mesReferencia: {
            gte: inicioMes,
            lt: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1),
          },
        },
        _sum: {
          valor: true,
        },
      }),
      // Receita total
      prisma.pagamento.aggregate({
        where: {
          status: StatusPagamento.PAGO,
        },
        _sum: {
          valor: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalPagamentos,
      pagamentosPendentes,
      pagamentosPagos,
      pagamentosVencidos,
      receitaMesAtual: Number(receitaMesAtual._sum.valor || 0),
      receitaTotal: Number(receitaTotal._sum.valor || 0),
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do super admin:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}





