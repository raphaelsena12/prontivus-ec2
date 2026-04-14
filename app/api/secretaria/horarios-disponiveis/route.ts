import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getBrazilHourMinute } from "@/lib/timezone-utils";
import { obterFaixasAgendaMedicoParaData } from "@/lib/medico-escala";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 }),
    };
  }

  return { authorized: true, clinicaId };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && end1 > start2;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");
    const dataParam = searchParams.get("data");
    const intervaloMin = Number(searchParams.get("intervaloMin") || "10");
    const excludeConsultaId = searchParams.get("excludeConsultaId");

    if (!medicoId || !dataParam) {
      return NextResponse.json({ error: "medicoId e data são obrigatórios" }, { status: 400 });
    }

    const dataInicio = new Date(`${dataParam}T00:00:00-03:00`);
    if (isNaN(dataInicio.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, clinicaId: auth.clinicaId, ativo: true },
      select: { id: true },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    const dataFimDia = new Date(`${dataParam}T23:59:59-03:00`);
    const faixas = await obterFaixasAgendaMedicoParaData(auth.clinicaId!, medicoId, dataInicio);

    if (faixas.length === 0) {
      return NextResponse.json({ horarios: [], data: dataParam, medicoId });
    }

    const [agendamentos, bloqueios] = await Promise.all([
      prisma.consulta.findMany({
        where: {
          clinicaId: auth.clinicaId,
          medicoId,
          dataHora: { gte: dataInicio, lte: dataFimDia },
          status: { notIn: ["CANCELADA", "CANCELADO"] },
          ...(excludeConsultaId ? { id: { not: excludeConsultaId } } : {}),
        },
        select: { dataHora: true, dataHoraFim: true },
      }),
      prisma.bloqueioAgenda.findMany({
        where: {
          clinicaId: auth.clinicaId,
          medicoId,
          dataInicio: { lte: dataFimDia },
          dataFim: { gte: dataInicio },
        },
      }),
    ]);

    const ocupado: Array<{ inicio: number; fim: number }> = [];

    agendamentos.forEach((item) => {
      const ini = new Date(item.dataHora);
      const fim = item.dataHoraFim
        ? new Date(item.dataHoraFim)
        : (() => {
            const d = new Date(ini);
            d.setMinutes(d.getMinutes() + 30);
            return d;
          })();
      const start = getBrazilHourMinute(ini);
      const end = getBrazilHourMinute(fim);
      ocupado.push({
        inicio: start.hours * 60 + start.minutes,
        fim: end.hours * 60 + end.minutes,
      });
    });

    bloqueios.forEach((item) => {
      ocupado.push({
        inicio: toMinutes(item.horaInicio),
        fim: toMinutes(item.horaFim),
      });
    });

    const horarios: string[] = [];
    for (const faixa of faixas) {
      const inicioFaixa = toMinutes(faixa.horaInicio);
      const fimFaixa = toMinutes(faixa.horaFim);
      for (let minuto = inicioFaixa; minuto + intervaloMin <= fimFaixa; minuto += intervaloMin) {
        const slotInicio = minuto;
        const slotFim = minuto + intervaloMin;
        const temConflito = ocupado.some((item) => overlaps(slotInicio, slotFim, item.inicio, item.fim));
        if (!temConflito) {
          const h = String(Math.floor(minuto / 60)).padStart(2, "0");
          const m = String(minuto % 60).padStart(2, "0");
          horarios.push(`${h}:${m}`);
        }
      }
    }

    return NextResponse.json({ horarios, data: dataParam, medicoId });
  } catch (error) {
    console.error("Erro ao buscar horários da secretaria:", error);
    return NextResponse.json({ error: "Erro ao buscar horários disponíveis" }, { status: 500 });
  }
}
