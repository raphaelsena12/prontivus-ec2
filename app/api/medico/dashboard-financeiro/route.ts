import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const whereConsulta = {
      medicoId: auth.medicoId,
      ...(dataInicio && dataFim && {
        dataHora: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim),
        },
      }),
    };

    // Buscar consultas do médico
    const consultas = await prisma.consulta.findMany({
      where: whereConsulta,
      select: {
        id: true,
        valorCobrado: true,
        valorRepassado: true,
        dataHora: true,
        status: true,
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Calcular totais
    const totalCobrado = consultas.reduce(
      (acc, c) => acc + Number(c.valorCobrado || 0),
      0
    );
    const totalRepassado = consultas.reduce(
      (acc, c) => acc + Number(c.valorRepassado || 0),
      0
    );
    const consultasRealizadas = consultas.filter(
      (c) => c.status === "REALIZADA"
    ).length;
    const consultasAgendadas = consultas.filter(
      (c) => c.status === "AGENDADA" || c.status === "CONFIRMADA"
    ).length;

    // Buscar contas a receber relacionadas às consultas
    const contasReceber = await prisma.contaReceber.findMany({
      where: {
        clinicaId: auth.clinicaId,
        pacienteId: {
          in: consultas.map((c) => c.paciente.id),
        },
      },
      select: {
        id: true,
        valor: true,
        status: true,
        dataVencimento: true,
        dataRecebimento: true,
      },
    });

    const totalReceber = contasReceber
      .filter((c) => c.status === "PENDENTE" || c.status === "VENCIDO")
      .reduce((acc, c) => acc + Number(c.valor), 0);

    const totalRecebido = contasReceber
      .filter((c) => c.status === "RECEBIDO")
      .reduce((acc, c) => acc + Number(c.valor), 0);

    // Buscar contas a pagar (se houver relacionamento com médico)
    const contasPagar = await prisma.contaPagar.findMany({
      where: {
        clinicaId: auth.clinicaId,
        // Filtrar apenas contas relacionadas ao médico se houver campo
      },
      select: {
        id: true,
        valor: true,
        status: true,
        dataVencimento: true,
      },
    });

    const totalPagar = contasPagar
      .filter((c) => c.status === "PENDENTE" || c.status === "VENCIDO")
      .reduce((acc, c) => acc + Number(c.valor), 0);

    return NextResponse.json({
      resumo: {
        totalCobrado,
        totalRepassado,
        totalReceber,
        totalRecebido,
        totalPagar,
        consultasRealizadas,
        consultasAgendadas,
        totalConsultas: consultas.length,
      },
      consultas: consultas.slice(0, 10), // Últimas 10 consultas
      contasReceber: contasReceber.slice(0, 10),
      contasPagar: contasPagar.slice(0, 10),
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard financeiro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dashboard financeiro" },
      { status: 500 }
    );
  }
}

