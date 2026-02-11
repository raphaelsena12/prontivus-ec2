import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    // Construir filtro de data
    const dateFilter = dataInicio && dataFim ? {
      dataVencimento: {
        gte: new Date(dataInicio + "T00:00:00"),
        lte: new Date(dataFim + "T23:59:59"),
      },
    } : {};

    // Buscar contas a pagar
    const contasPagar = await prisma.contaPagar.findMany({
      where: {
        clinicaId: auth.clinicaId!,
        ...dateFilter,
      },
      select: {
        valor: true,
        status: true,
        dataVencimento: true,
      },
    });

    // Buscar contas a receber
    const contasReceber = await prisma.contaReceber.findMany({
      where: {
        clinicaId: auth.clinicaId!,
        ...dateFilter,
      },
      select: {
        valor: true,
        status: true,
        dataVencimento: true,
      },
    });

    // Calcular totais
    const totalPagar = contasPagar.reduce(
      (acc, conta) => acc + Number(conta.valor || 0),
      0
    );

    const totalReceber = contasReceber.reduce(
      (acc, conta) => acc + Number(conta.valor || 0),
      0
    );

    return NextResponse.json({
      totalPagar,
      totalReceber,
    });
  } catch (error) {
    console.error("Erro ao buscar dados de contas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados de contas" },
      { status: 500 }
    );
  }
}
