import { NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const clinicaId = auth.clinicaId!;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const inicioMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
    const dozeAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);

    const [
      aggMes, aggMesAnt, aggTotal,
      totalConsultas, pendentes,
      statusGrupo,
      cTrend, cpTrend, crTrend,
      mesMedicos,
    ] = await Promise.all([
      prisma.consulta.aggregate({ where: { clinicaId, status: "REALIZADA", dataHora: { gte: inicioMes, lte: fimMes } }, _sum: { valorCobrado: true }, _count: { _all: true } }),
      prisma.consulta.aggregate({ where: { clinicaId, status: "REALIZADA", dataHora: { gte: inicioMesAnt, lte: fimMesAnt } }, _sum: { valorCobrado: true }, _count: { _all: true } }),
      prisma.consulta.aggregate({ where: { clinicaId, status: "REALIZADA" }, _sum: { valorCobrado: true } }),
      prisma.consulta.count({ where: { clinicaId } }),
      prisma.consulta.count({ where: { clinicaId, status: "AGENDADA", dataHora: { gt: hoje } } }),
      prisma.consulta.groupBy({ by: ["status"], where: { clinicaId }, _count: { _all: true } }),
      prisma.consulta.findMany({ where: { clinicaId, status: "REALIZADA", dataHora: { gte: dozeAtras } }, select: { dataHora: true, valorCobrado: true } }),
      prisma.contaPagar.findMany({ where: { clinicaId, dataVencimento: { gte: dozeAtras } }, select: { dataVencimento: true, valor: true } }),
      prisma.contaReceber.findMany({ where: { clinicaId, dataVencimento: { gte: dozeAtras } }, select: { dataVencimento: true, valor: true } }),
      prisma.consulta.findMany({ where: { clinicaId, status: "REALIZADA", dataHora: { gte: inicioMes, lte: fimMes } }, select: { medicoId: true, valorCobrado: true } }),
    ]);

    // nomes dos médicos
    const ids = [...new Set(mesMedicos.map((c) => c.medicoId))];
    const medicos = await prisma.medico.findMany({ where: { id: { in: ids } }, select: { id: true, usuario: { select: { nome: true } } } });
    const nomeMap = Object.fromEntries(medicos.map((m) => [m.id, m.usuario.nome]));

    // top médicos
    const agg: Record<string, { receita: number; consultas: number }> = {};
    for (const c of mesMedicos) {
      if (!agg[c.medicoId]) agg[c.medicoId] = { receita: 0, consultas: 0 };
      agg[c.medicoId].receita += Number(c.valorCobrado || 0);
      agg[c.medicoId].consultas++;
    }
    const topMedicos = Object.entries(agg)
      .map(([id, v]) => ({ medicoId: id, nome: nomeMap[id] ?? "Médico", ...v }))
      .sort((a, b) => b.receita - a.receita).slice(0, 6);

    // trend 12 meses
    const meses = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      return { label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), ano: d.getFullYear(), mes: d.getMonth() };
    });

    const trend = meses.map(({ label, ano, mes }) => ({
      mes: label,
      faturamento: cTrend.filter((c) => { const d = new Date(c.dataHora); return d.getFullYear() === ano && d.getMonth() === mes; }).reduce((s, c) => s + Number(c.valorCobrado || 0), 0),
      consultas: cTrend.filter((c) => { const d = new Date(c.dataHora); return d.getFullYear() === ano && d.getMonth() === mes; }).length,
      contasPagar: cpTrend.filter((c) => { const d = new Date(c.dataVencimento); return d.getFullYear() === ano && d.getMonth() === mes; }).reduce((s, c) => s + Number(c.valor || 0), 0),
      contasReceber: crTrend.filter((c) => { const d = new Date(c.dataVencimento); return d.getFullYear() === ano && d.getMonth() === mes; }).reduce((s, c) => s + Number(c.valor || 0), 0),
    }));

    const receitaMes = Number(aggMes._sum.valorCobrado || 0);
    const receitaAnt = Number(aggMesAnt._sum.valorCobrado || 0);
    const consultasMes = aggMes._count._all;
    const consultasAnt = aggMesAnt._count._all;
    const statusMap = Object.fromEntries(statusGrupo.map((s) => [s.status, s._count._all]));

    return NextResponse.json({
      cards: {
        totalConsultas,
        pendentes,
        pagas: statusMap["REALIZADA"] ?? 0,
        vencidas: await prisma.consulta.count({ where: { clinicaId, status: "AGENDADA", dataHora: { lt: hoje } } }),
        receitaMes,
        receitaTotal: Number(aggTotal._sum.valorCobrado || 0),
        variacaoReceita: receitaAnt > 0 ? parseFloat(((receitaMes - receitaAnt) / receitaAnt * 100).toFixed(1)) : 0,
        variacaoConsultas: consultasAnt > 0 ? parseFloat(((consultasMes - consultasAnt) / consultasAnt * 100).toFixed(1)) : 0,
      },
      statusBreakdown: {
        agendadas: statusMap["AGENDADA"] ?? 0,
        confirmadas: statusMap["CONFIRMADA"] ?? 0,
        emAtendimento: statusMap["EM_ATENDIMENTO"] ?? 0,
        realizadas: statusMap["REALIZADA"] ?? 0,
      },
      trend,
      topMedicos,
    });
  } catch (error) {
    console.error("Erro overview dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
