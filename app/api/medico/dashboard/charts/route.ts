import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getDateRangeFromFilter } from "@/lib/timezone-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const dateFilter = (searchParams.get("filter") || "mensal") as "diario" | "semanal" | "mensal" | "anual";
    const { start: dataInicio, end: dataFim } = getDateRangeFromFilter(dateFilter);

    // Build periods based on filter
    let periodos: Array<{ label: string; start: Date; end: Date }> = [];

    if (dateFilter === "diario") {
      const current = new Date(dataInicio);
      let hourNum = 0;
      while (current <= dataFim && hourNum < 24) {
        const hourStart = new Date(current);
        hourStart.setHours(hourNum, 0, 0, 0);
        const hourEnd = new Date(current);
        hourEnd.setHours(hourNum, 59, 59, 999);
        if (hourEnd > dataFim) hourEnd.setTime(dataFim.getTime());
        periodos.push({
          label: `${String(hourNum).padStart(2, "0")}h`,
          start: hourStart,
          end: hourEnd,
        });
        hourNum++;
      }
    } else if (dateFilter === "semanal") {
      const current = new Date(dataInicio);
      while (current <= dataFim) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        if (dayEnd > dataFim) dayEnd.setTime(dataFim.getTime());
        periodos.push({
          label: dayStart.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          start: dayStart,
          end: dayEnd,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (dateFilter === "mensal") {
      const current = new Date(dataInicio);
      while (current <= dataFim) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        if (dayEnd > dataFim) dayEnd.setTime(dataFim.getTime());
        periodos.push({
          label: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""),
          start: dayStart,
          end: dayEnd,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (dateFilter === "anual") {
      const current = new Date(dataInicio);
      while (current <= dataFim) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        if (monthEnd > dataFim) monthEnd.setTime(dataFim.getTime());
        periodos.push({
          label: monthStart.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          start: monthStart,
          end: monthEnd,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    // 1. Receita Comparativa: Particular vs Convênio por período
    const consultasReceita = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        status: "REALIZADA",
        dataHora: { gte: dataInicio, lte: dataFim },
      },
      select: {
        dataHora: true,
        valorCobrado: true,
        operadoraId: true,
      },
    });

    const receitaComparativa = periodos.map((p) => {
      const doPeriodo = consultasReceita.filter((c) => {
        const d = new Date(c.dataHora);
        return d >= p.start && d <= p.end;
      });
      const particular = doPeriodo
        .filter((c) => !c.operadoraId)
        .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);
      const convenio = doPeriodo
        .filter((c) => !!c.operadoraId)
        .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);
      return {
        label: p.label,
        particular: Math.round(particular * 100) / 100,
        convenio: Math.round(convenio * 100) / 100,
      };
    });

    // 2. Receita por Convênio no período
    const consultasConvenio = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        status: "REALIZADA",
        dataHora: { gte: dataInicio, lte: dataFim },
        operadoraId: { not: null },
      },
      select: {
        valorCobrado: true,
        operadora: {
          select: { nomeFantasia: true, razaoSocial: true },
        },
      },
    });

    const convenioMap = new Map<string, number>();
    for (const c of consultasConvenio) {
      const nome = c.operadora?.nomeFantasia || c.operadora?.razaoSocial || "Convênio";
      convenioMap.set(nome, (convenioMap.get(nome) || 0) + Number(c.valorCobrado || 0));
    }
    const receitaPorConvenio = Array.from(convenioMap.entries())
      .map(([operadora, total]) => ({ operadora, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      receitaComparativa,
      receitaPorConvenio,
    });
  } catch (error) {
    console.error("Erro ao buscar dados dos gráficos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados dos gráficos" },
      { status: 500 }
    );
  }
}
