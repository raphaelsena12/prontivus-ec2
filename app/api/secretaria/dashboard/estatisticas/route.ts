import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { brazilTodayStart, brazilMonthStart } from "@/lib/timezone-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.tipo !== TipoUsuario.SECRETARIA) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      );
    }

    const hoje = brazilTodayStart();
    const inicioMes = brazilMonthStart();

    // Buscar tipo de consulta "Retorno"
    const tipoRetorno = await prisma.tipoConsulta.findFirst({
      where: {
        codigo: "RETORNO",
        ativo: true,
      },
    });

    // Buscar estatísticas da secretária
    const [
      totalAgendamentos,
      agendamentosPendentes,
      agendamentosRealizados,
      agendamentosVencidos,
      receitaMesAtual,
      receitaTotal,
      receitaParticular,
      receitaConvenios,
      retornos,
    ] = await Promise.all([
      // Total de agendamentos
      prisma.consulta.count({
        where: {
          clinicaId,
        },
      }),
      // Agendamentos pendentes (agendados para hoje ou futuro)
      prisma.consulta.count({
        where: {
          clinicaId,
          status: "AGENDADA",
          dataHora: {
            gte: hoje,
          },
        },
      }),
      // Agendamentos realizados
      prisma.consulta.count({
        where: {
          clinicaId,
          status: "REALIZADA",
        },
      }),
      // Agendamentos vencidos (agendados mas passaram da data)
      prisma.consulta.count({
        where: {
          clinicaId,
          status: "AGENDADA",
          dataHora: {
            lt: hoje,
          },
        },
      }),
      // Receita do mês atual
      prisma.consulta.aggregate({
        where: {
          clinicaId,
          status: "REALIZADA",
          dataHora: {
            gte: inicioMes,
          },
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Receita total
      prisma.consulta.aggregate({
        where: {
          clinicaId,
          status: "REALIZADA",
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Receita Particular (sem operadora)
      prisma.consulta.aggregate({
        where: {
          clinicaId,
          status: "REALIZADA",
          operadoraId: null,
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Receita Convênios (com operadora)
      prisma.consulta.aggregate({
        where: {
          clinicaId,
          status: "REALIZADA",
          operadoraId: { not: null },
        },
        _sum: {
          valorCobrado: true,
        },
      }),
      // Retornos (consultas do tipo Retorno realizadas)
      prisma.consulta.count({
        where: {
          clinicaId,
          status: "REALIZADA",
          tipoConsultaId: tipoRetorno?.id,
        },
      }),
    ]);

    return NextResponse.json({
      totalPagamentos: totalAgendamentos,
      pagamentosPendentes: agendamentosPendentes,
      pagamentosPagos: agendamentosRealizados,
      pagamentosVencidos: agendamentosVencidos,
      receitaMesAtual: Number(receitaMesAtual._sum.valorCobrado || 0),
      receitaTotal: Number(receitaTotal._sum.valorCobrado || 0),
      receitaParticular: Number(receitaParticular._sum.valorCobrado || 0),
      receitaConvenios: Number(receitaConvenios._sum.valorCobrado || 0),
      retornos: retornos,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas da secretária:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}





