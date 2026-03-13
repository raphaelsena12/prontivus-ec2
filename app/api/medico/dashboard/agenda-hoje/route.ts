import { NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { brazilTodayStart, brazilTodayEnd } from "@/lib/timezone-utils";

export async function GET() {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const inicioHoje = brazilTodayStart();
    const fimHoje = brazilTodayEnd();

    const agendamentos = await prisma.consulta.findMany({
      where: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        status: { in: ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "REALIZADA"] },
        dataHora: { gte: inicioHoje, lte: fimHoje },
      },
      select: {
        id: true,
        dataHora: true,
        status: true,
        paciente: { select: { nome: true, id: true } },
        operadora: { select: { nomeFantasia: true, razaoSocial: true } },
        tipoConsulta: { select: { nome: true } },
      },
      orderBy: { dataHora: "asc" },
    });

    const aguardando = agendamentos.filter((a) =>
      ["AGENDADA", "CONFIRMADA"].includes(a.status)
    );
    const proximoAtendimento = aguardando.length > 0 ? aguardando[0] : null;

    return NextResponse.json({
      proximoAtendimento,
      agendamentosHoje: agendamentos,
    });
  } catch (error) {
    console.error("Erro ao buscar agenda de hoje:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agenda de hoje" },
      { status: 500 }
    );
  }
}
