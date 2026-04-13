import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getDateRangeFromFilter } from "@/lib/timezone-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const dateFilter = (searchParams.get("filter") || "diario") as "diario" | "mensal" | "anual";
    const { start: dataInicio, end: dataFim } = getDateRangeFromFilter(dateFilter);

    const baseWhere = {
      medicoId: auth.medicoId,
      clinicaId: auth.clinicaId,
      dataHora: { gte: dataInicio, lte: dataFim },
    };

    const [
      totalConsultas,
      consultasPendentes,
      consultasRealizadas,
      consultasVencidas,
      receitaParticular,
      receitaConvenios,
      retornos,
    ] = await Promise.all([
      // Total de consultas no período
      prisma.consulta.count({
        where: baseWhere,
      }),
      // Consultas pendentes (agendadas) no período
      prisma.consulta.count({
        where: {
          ...baseWhere,
          status: "AGENDADA",
        },
      }),
      // Consultas realizadas no período
      prisma.consulta.count({
        where: {
          ...baseWhere,
          status: "REALIZADA",
        },
      }),
      // Consultas vencidas no período (agendadas mas passaram da data)
      prisma.consulta.count({
        where: {
          ...baseWhere,
          status: "AGENDADA",
          dataHora: { gte: dataInicio, lt: new Date() },
        },
      }),
      // Receita particular no período
      prisma.consulta.aggregate({
        where: {
          ...baseWhere,
          status: "REALIZADA",
          operadoraId: null,
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Receita convênios no período
      prisma.consulta.aggregate({
        where: {
          ...baseWhere,
          status: "REALIZADA",
          operadoraId: { not: null },
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Retornos no período
      prisma.consulta.count({
        where: {
          ...baseWhere,
          tipoConsulta: {
            nome: { contains: "retorno", mode: "insensitive" },
          },
        },
      }),
    ]);

    const recParticular = Number(receitaParticular._sum.valorCobrado || 0);
    const recConvenios = Number(receitaConvenios._sum.valorCobrado || 0);

    return NextResponse.json({
      totalPagamentos: totalConsultas,
      pagamentosPendentes: consultasPendentes,
      pagamentosPagos: consultasRealizadas,
      pagamentosVencidos: consultasVencidas,
      receitaMesAtual: recParticular + recConvenios,
      receitaTotal: recParticular + recConvenios,
      receitaParticular: recParticular,
      receitaConvenios: recConvenios,
      retornos,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do médico:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}
