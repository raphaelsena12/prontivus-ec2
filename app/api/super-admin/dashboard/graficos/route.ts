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

    // Buscar dados dos últimos 12 meses
    const hoje = new Date();
    const meses = [];
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesInicio = new Date(data.getFullYear(), data.getMonth(), 1);
      const mesFim = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59);
      
      const mesLabel = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
      
      // Buscar faturamento do mês (pagamentos pagos)
      const faturamento = await prisma.pagamento.aggregate({
        where: {
          status: StatusPagamento.PAGO,
          mesReferencia: {
            gte: mesInicio,
            lte: mesFim,
          },
        },
        _sum: {
          valor: true,
        },
      });

      // Buscar vendas do mês (total de pagamentos confirmados)
      const vendas = await prisma.pagamento.count({
        where: {
          status: StatusPagamento.PAGO,
          mesReferencia: {
            gte: mesInicio,
            lte: mesFim,
          },
        },
      });

      // Calcular churn rate (clínicas que não pagaram no mês mas pagaram no mês anterior)
      const mesAnteriorInicio = new Date(data.getFullYear(), data.getMonth() - 1, 1);
      const mesAnteriorFim = new Date(data.getFullYear(), data.getMonth(), 0, 23, 59, 59);
      
      const clinicasMesAnterior = await prisma.pagamento.findMany({
        where: {
          status: StatusPagamento.PAGO,
          mesReferencia: {
            gte: mesAnteriorInicio,
            lte: mesAnteriorFim,
          },
        },
        select: {
          tenantId: true,
        },
        distinct: ["tenantId"],
      });

      const clinicasMesAtual = await prisma.pagamento.findMany({
        where: {
          status: StatusPagamento.PAGO,
          mesReferencia: {
            gte: mesInicio,
            lte: mesFim,
          },
        },
        select: {
          tenantId: true,
        },
        distinct: ["tenantId"],
      });

      const clinicasAnterioresIds = new Set(clinicasMesAnterior.map(c => c.tenantId));
      const clinicasAtuaisIds = new Set(clinicasMesAtual.map(c => c.tenantId));
      
      const churned = Array.from(clinicasAnterioresIds).filter(
        id => !clinicasAtuaisIds.has(id)
      ).length;
      
      const churnRate = clinicasAnterioresIds.size > 0 
        ? (churned / clinicasAnterioresIds.size) * 100 
        : 0;

      meses.push({
        mes: mesLabel,
        faturamento: Number(faturamento._sum.valor || 0),
        vendas,
        churnRate: Number(churnRate.toFixed(2)),
      });
    }

    return NextResponse.json({ dados: meses });
  } catch (error) {
    console.error("Erro ao buscar dados dos gráficos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados dos gráficos" },
      { status: 500 }
    );
  }
}





