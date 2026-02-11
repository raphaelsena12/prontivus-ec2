import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Últimos 6 meses para gráficos mensais
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    // 1. Consultas presenciais × telemedicina (últimos 6 meses)
    const consultasPorTipo = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        dataHora: { gte: seisMesesAtras },
        status: { in: ["REALIZADA", "CONFIRMADA", "AGENDADA"] },
      },
      select: {
        dataHora: true,
        tipoConsulta: { select: { nome: true } },
      },
    });

    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        ano: d.getFullYear(),
        mesNum: d.getMonth(),
      });
    }

    const presencialVsTele = meses.map((m) => {
      const doMes = consultasPorTipo.filter((c) => {
        const d = new Date(c.dataHora);
        return d.getMonth() === m.mesNum && d.getFullYear() === m.ano;
      });
      const tele = doMes.filter((c) =>
        c.tipoConsulta?.nome?.toLowerCase().includes("telemedicina")
      ).length;
      return {
        mes: m.mes,
        presencial: doMes.length - tele,
        telemedicina: tele,
      };
    });

    // 2. Taxa de faltas (no-show) - últimos 6 meses
    const consultasParaNoShow = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        dataHora: { gte: seisMesesAtras, lt: hoje },
      },
      select: {
        dataHora: true,
        status: true,
      },
    });

    const noShowPorMes = meses.map((m) => {
      const doMes = consultasParaNoShow.filter((c) => {
        const d = new Date(c.dataHora);
        return d.getMonth() === m.mesNum && d.getFullYear() === m.ano;
      });
      const total = doMes.length;
      const canceladas = doMes.filter((c) => c.status === "CANCELADA").length;
      const taxa = total > 0 ? Math.round((canceladas / total) * 100) : 0;
      return {
        mes: m.mes,
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
        createdAt: { gte: seisMesesAtras },
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

    const tempoMedioPorMes = meses.map((m) => {
      const doMes = prontuarios.filter((p) => {
        const d = new Date(p.createdAt);
        return d.getMonth() === m.mesNum && d.getFullYear() === m.ano;
      });

      if (doMes.length === 0) return { mes: m.mes, minutos: 0 };

      const totalMinutos = doMes.reduce((acc, p) => {
        const diff = new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime();
        const minutos = Math.max(5, Math.min(120, diff / 60000)); // clamp entre 5-120min
        return acc + minutos;
      }, 0);

      return {
        mes: m.mes,
        minutos: Math.round(totalMinutos / doMes.length),
      };
    });

    // 4. Faturamento particular (dia atual + mês atual)
    const inicioHoje = new Date(hoje);
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    // Faturamento por dia no mês atual (particular = sem operadora)
    const consultasParticularMes = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        operadoraId: null,
        status: "REALIZADA",
        dataHora: { gte: inicioMes },
      },
      select: {
        dataHora: true,
        valorCobrado: true,
      },
    });

    // Agrupar por semana do mês
    const semanas: { label: string; valor: number }[] = [];
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const semanasCount = Math.ceil(diasNoMes / 7);

    for (let s = 0; s < semanasCount; s++) {
      const diaInicio = s * 7 + 1;
      const diaFim = Math.min((s + 1) * 7, diasNoMes);
      const valor = consultasParticularMes
        .filter((c) => {
          const dia = new Date(c.dataHora).getDate();
          return dia >= diaInicio && dia <= diaFim;
        })
        .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);

      semanas.push({
        label: `Sem ${s + 1}`,
        valor: Math.round(valor * 100) / 100,
      });
    }

    // Totais
    const faturamentoHoje = consultasParticularMes
      .filter((c) => {
        const d = new Date(c.dataHora);
        return d >= inicioHoje && d <= fimHoje;
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
