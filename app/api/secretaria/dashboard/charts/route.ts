import { NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.tipo !== TipoUsuario.SECRETARIA)
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioHoje = new Date(hoje); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje); fimHoje.setHours(23, 59, 59, 999);
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    // Últimos 6 meses para labels
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      return { label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), ano: d.getFullYear(), mes: d.getMonth() };
    });

    // 1. Faturamento particular do mês (operadoraId null = particular)
    const consultasParticular = await prisma.consulta.findMany({
      where: { clinicaId, operadoraId: null, status: "REALIZADA", dataHora: { gte: inicioMes } },
      select: { dataHora: true, valorCobrado: true },
    });

    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const semanasCount = Math.ceil(diasNoMes / 7);
    const semanas = Array.from({ length: semanasCount }, (_, s) => {
      const diaIni = s * 7 + 1;
      const diaFim = Math.min((s + 1) * 7, diasNoMes);
      return {
        label: `Sem ${s + 1}`,
        valor: consultasParticular
          .filter((c) => { const d = new Date(c.dataHora).getDate(); return d >= diaIni && d <= diaFim; })
          .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0),
      };
    });

    const faturamentoHoje = consultasParticular
      .filter((c) => { const d = new Date(c.dataHora); return d >= inicioHoje && d <= fimHoje; })
      .reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);
    const faturamentoMes = consultasParticular.reduce((acc, c) => acc + Number(c.valorCobrado || 0), 0);

    // 2. Consultas últimos 6 meses (realizadas, faltas/canceladas)
    const consultasSeis = await prisma.consulta.findMany({
      where: { clinicaId, dataHora: { gte: seisMesesAtras, lt: hoje } },
      select: { dataHora: true, status: true },
    });

    const consultasFinalizadas = meses.map(({ label, ano, mes }) => {
      const doMes = consultasSeis.filter((c) => {
        const d = new Date(c.dataHora);
        return d.getFullYear() === ano && d.getMonth() === mes;
      });
      return {
        mes: label,
        realizadas: doMes.filter((c) => c.status === "REALIZADA").length,
        faltas: doMes.filter((c) => c.status === "CANCELADA").length,
        cancelamentos: doMes.filter((c) => !["REALIZADA", "CANCELADA"].includes(c.status) && new Date(c.dataHora) < hoje).length,
      };
    });

    // 3. Principais convênios (operadoras com mais consultas no mês)
    const consultasOperadoras = await prisma.consulta.findMany({
      where: { clinicaId, dataHora: { gte: inicioMes }, status: { in: ["REALIZADA", "CONFIRMADA", "AGENDADA"] } },
      select: { operadoraId: true, operadora: { select: { razaoSocial: true } } },
    });

    const operadoraMap: Record<string, { nome: string; total: number }> = {};
    let particular = 0;
    for (const c of consultasOperadoras) {
      if (!c.operadoraId) { particular++; continue; }
      if (!operadoraMap[c.operadoraId]) operadoraMap[c.operadoraId] = { nome: c.operadora?.razaoSocial ?? "Convênio", total: 0 };
      operadoraMap[c.operadoraId].total++;
    }

    const convenios = Object.values(operadoraMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
      .map((o) => ({ convenio: o.nome, valor: o.total }));
    if (particular > 0) convenios.push({ convenio: "Particular", valor: particular });

    return NextResponse.json({
      faturamentoParticular: { semanas, hoje: faturamentoHoje, mes: faturamentoMes },
      consultasFinalizadas,
      convenios,
    });
  } catch (error) {
    console.error("Erro charts secretaria:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
