import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { brazilTodayStart, brazilMonthStart, getDateRangeFromFilter } from "@/lib/timezone-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    // Obter filtro de data da query string (default: mensal)
    const { searchParams } = new URL(request.url);
    const dateFilter = (searchParams.get("filter") || "mensal") as "diario" | "mensal" | "anual";
    const { start: dataInicio, end: dataFim } = getDateRangeFromFilter(dateFilter);

    const hoje = brazilTodayStart();

    // Buscar estatísticas do médico
    const [
      totalConsultas,
      consultasPendentes,
      consultasRealizadas,
      consultasVencidas,
      receitaMesAtual,
      receitaTotal,
    ] = await Promise.all([
      // Total de consultas
      prisma.consulta.count({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
        },
      }),
      // Consultas pendentes (agendadas)
      prisma.consulta.count({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          status: "AGENDADA",
          dataHora: {
            gte: hoje,
          },
        },
      }),
      // Consultas realizadas
      prisma.consulta.count({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          status: "REALIZADA",
        },
      }),
      // Consultas vencidas (agendadas mas passaram da data)
      prisma.consulta.count({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          status: "AGENDADA",
          dataHora: {
            lt: hoje,
          },
        },
      }),
      // Receita do período filtrado
      prisma.consulta.aggregate({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          status: "REALIZADA",
          dataHora: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Receita total
      prisma.consulta.aggregate({
        where: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          status: "REALIZADA",
        },
        _sum: {
          valorCobrado: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalPagamentos: totalConsultas,
      pagamentosPendentes: consultasPendentes,
      pagamentosPagos: consultasRealizadas,
      pagamentosVencidos: consultasVencidas,
      receitaMesAtual: Number(receitaMesAtual._sum.valorCobrado || 0),
      receitaTotal: Number(receitaTotal._sum.valorCobrado || 0),
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do médico:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}





