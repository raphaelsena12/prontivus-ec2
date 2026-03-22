import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type MonthBucket = {
  mes: string;
  year: number;
  month: number;
  start: Date;
  end: Date;
};

function getLastSixMonthBuckets(): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let i = 5; i >= 0; i--) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    buckets.push({
      mes: start
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "")
        .toLowerCase(),
      year: start.getFullYear(),
      month: start.getMonth(),
      start,
      end,
    });
  }

  return buckets;
}

function findBucketByDate(date: Date, buckets: MonthBucket[]) {
  return buckets.find(
    (bucket) =>
      date >= bucket.start &&
      date <= bucket.end &&
      date.getFullYear() === bucket.year &&
      date.getMonth() === bucket.month
  );
}

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
        dataPagamento: true,
      },
    });

    const totalPagar = contasPagar
      .filter((c) => c.status === "PENDENTE" || c.status === "VENCIDO")
      .reduce((acc, c) => acc + Number(c.valor), 0);

    const monthBuckets = getLastSixMonthBuckets();
    const chartData = {
      receitaPorMes: monthBuckets.map((bucket) => ({
        mes: bucket.mes,
        receita: 0,
      })),
      entradasVsSaidas: monthBuckets.map((bucket) => ({
        mes: bucket.mes,
        entradas: 0,
        saidas: 0,
      })),
      contasReceber: monthBuckets.map((bucket) => ({
        mes: bucket.mes,
        pendente: 0,
        recebido: 0,
      })),
    };

    for (const consulta of consultas) {
      const date = new Date(consulta.dataHora);
      const bucket = findBucketByDate(date, monthBuckets);
      if (!bucket) continue;

      const entry = chartData.receitaPorMes.find((item) => item.mes === bucket.mes);
      if (entry) {
        entry.receita += Number(consulta.valorCobrado || 0);
      }
    }

    for (const conta of contasReceber) {
      const baseDate = conta.dataRecebimento || conta.dataVencimento;
      const date = new Date(baseDate);
      const bucket = findBucketByDate(date, monthBuckets);
      if (!bucket) continue;

      const entrada = chartData.entradasVsSaidas.find((item) => item.mes === bucket.mes);
      const receber = chartData.contasReceber.find((item) => item.mes === bucket.mes);
      if (!entrada || !receber) continue;

      const value = Number(conta.valor || 0);
      if (conta.status === "RECEBIDO") {
        entrada.entradas += value;
        receber.recebido += value;
      } else if (conta.status === "PENDENTE" || conta.status === "VENCIDO") {
        receber.pendente += value;
      }
    }

    for (const conta of contasPagar) {
      const baseDate = conta.dataPagamento || conta.dataVencimento;
      const date = new Date(baseDate);
      const bucket = findBucketByDate(date, monthBuckets);
      if (!bucket) continue;

      const entry = chartData.entradasVsSaidas.find((item) => item.mes === bucket.mes);
      if (!entry) continue;

      const value = Number(conta.valor || 0);
      if (conta.status === "PAGO") {
        entry.saidas += value;
      }
    }

    chartData.receitaPorMes = chartData.receitaPorMes.map((item) => ({
      ...item,
      receita: Math.round(item.receita * 100) / 100,
    }));
    chartData.entradasVsSaidas = chartData.entradasVsSaidas.map((item) => ({
      ...item,
      entradas: Math.round(item.entradas * 100) / 100,
      saidas: Math.round(item.saidas * 100) / 100,
    }));
    chartData.contasReceber = chartData.contasReceber.map((item) => ({
      ...item,
      pendente: Math.round(item.pendente * 100) / 100,
      recebido: Math.round(item.recebido * 100) / 100,
    }));

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
      chartData,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard financeiro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dashboard financeiro" },
      { status: 500 }
    );
  }
}

