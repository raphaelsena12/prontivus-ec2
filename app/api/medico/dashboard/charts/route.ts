import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { brazilToday, brazilTodayStart, brazilTodayEnd, brazilMonthStart, brazilNMonthsAgoStart, getDateRangeFromFilter } from "@/lib/timezone-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    // Obter filtro de data da query string (default: mensal)
    const { searchParams } = new URL(request.url);
    const dateFilter = (searchParams.get("filter") || "mensal") as "diario" | "mensal" | "anual";
    const { start: dataInicio, end: dataFim } = getDateRangeFromFilter(dateFilter);

    const inicioMes = brazilMonthStart();

    // Determinar agrupamento baseado no filtro selecionado
    let periodos: Array<{ label: string; start: Date; end: Date }> = [];
    
    if (dateFilter === "diario") {
      // Diário: agrupar por hora
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
    } else if (dateFilter === "mensal") {
      // Mensal: agrupar por dia
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
      // Anual: agrupar por mês
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

    // 1. Consultas presenciais × telemedicina (período filtrado)
    const consultasPorTipo = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        dataHora: { gte: dataInicio, lte: dataFim },
        status: { in: ["REALIZADA", "CONFIRMADA", "AGENDADA"] },
      },
      select: {
        dataHora: true,
        tipoConsulta: { select: { nome: true } },
      },
    });

    const presencialVsTele = periodos.map((p) => {
      const doPeriodo = consultasPorTipo.filter((c) => {
        const d = new Date(c.dataHora);
        return d >= p.start && d <= p.end;
      });
      const tele = doPeriodo.filter((c) =>
        c.tipoConsulta?.nome?.toLowerCase().includes("telemedicina")
      ).length;
      return {
        mes: p.label,
        presencial: doPeriodo.length - tele,
        telemedicina: tele,
      };
    });

    // 2. Taxa de faltas (no-show) - período filtrado
    const consultasParaNoShow = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        dataHora: { gte: dataInicio, lte: dataFim },
      },
      select: {
        dataHora: true,
        status: true,
      },
    });

    const noShowPorMes = periodos.map((p) => {
      const doPeriodo = consultasParaNoShow.filter((c) => {
        const d = new Date(c.dataHora);
        return d >= p.start && d <= p.end;
      });
      const total = doPeriodo.length;
      const canceladas = doPeriodo.filter((c) => c.status === "CANCELADA").length;
      const taxa = total > 0 ? Math.round((canceladas / total) * 100) : 0;
      return {
        mes: p.label,
        taxa,
        canceladas,
        total,
      };
    });

    // 3. Tempo médio de consulta (baseado em prontuários com createdAt/updatedAt)
    const prontuarios = await prisma.prontuario.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        createdAt: { gte: dataInicio, lte: dataFim },
      },
      select: {
        createdAt: true,
        updatedAt: true,
        consulta: {
          select: {
            dataHora: true,
          },
        },
      },
    });

    const tempoMedioPorMes = periodos.map((p) => {
      const doPeriodo = prontuarios.filter((pront) => {
        const d = new Date(pront.createdAt);
        return d >= p.start && d <= p.end;
      });

      if (doPeriodo.length === 0) return { mes: p.label, minutos: 0 };

      const totalMinutos = doPeriodo.reduce((acc, pront) => {
        const diff = new Date(pront.updatedAt).getTime() - new Date(pront.createdAt).getTime();
        const minutos = Math.max(5, Math.min(120, diff / 60000)); // clamp entre 5-120min
        return acc + minutos;
      }, 0);

      return {
        mes: p.label,
        minutos: Math.round(totalMinutos / doPeriodo.length),
      };
    });

    // 4. Faturamento particular (período filtrado)
    const inicioHoje = brazilTodayStart();
    const fimHoje = brazilTodayEnd();

    // Faturamento por dia no período filtrado (particular = sem operadora)
    const consultasParticularMes = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        operadoraId: null,
        status: "REALIZADA",
        dataHora: { gte: dataInicio, lte: dataFim },
      },
      select: {
        dataHora: true,
        valorCobrado: true,
      },
    });

    // Agrupar por período (usar os mesmos períodos calculados acima)
    const semanas: { label: string; valor: number }[] = periodos.map((p) => {
      const valor = consultasParticularMes
        .filter((c) => {
          const d = new Date(c.dataHora);
          return d >= p.start && d <= p.end;
        })
        .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);

      return {
        label: p.label,
        valor: Math.round(valor * 100) / 100,
      };
    });

    // Totais: hoje (se estiver no período) e total do período
    const faturamentoHoje = consultasParticularMes
      .filter((c) => {
        const d = new Date(c.dataHora);
        return d >= inicioHoje && d <= fimHoje && d >= dataInicio && d <= dataFim;
      })
      .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);

    const faturamentoMes = consultasParticularMes.reduce(
      (acc, c) => acc + Number(c.valorCobrado || 0),
      0
    );

    return NextResponse.json({
      presencialVsTele,
      noShowPorMes,
      tempoMedioPorMes,
      faturamentoParticular: {
        semanas,
        hoje: Math.round(faturamentoHoje * 100) / 100,
        mes: Math.round(faturamentoMes * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar dados dos gráficos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados dos gráficos" },
      { status: 500 }
    );
  }
}
