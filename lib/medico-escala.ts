import { prisma } from "@/lib/prisma";

const BRAZIL_TZ = "America/Sao_Paulo";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export type FaixaHorario = {
  horaInicio: string;
  horaFim: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getBrazilWeekdayIndex(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    weekday: "short",
  })
    .format(date)
    .toLowerCase();

  return WEEKDAY_TO_INDEX[weekday] ?? 0;
}

function getBrazilDateString(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRAZIL_TZ,
  }).format(date);
}

export function horarioEstaDentroDasFaixas(
  horaInicio: string,
  horaFim: string,
  faixas: FaixaHorario[]
): boolean {
  const inicio = toMinutes(horaInicio);
  const fim = toMinutes(horaFim);

  return faixas.some((faixa) => {
    const faixaInicio = toMinutes(faixa.horaInicio);
    const faixaFim = toMinutes(faixa.horaFim);
    return inicio >= faixaInicio && fim <= faixaFim;
  });
}

export async function obterFaixasAgendaMedicoParaData(
  clinicaId: string,
  medicoId: string,
  data: Date
): Promise<FaixaHorario[]> {
  const dataStr = getBrazilDateString(data);
  const inicioDia = new Date(`${dataStr}T00:00:00-03:00`);
  const fimDia = new Date(`${dataStr}T23:59:59-03:00`);

  const excecoes = await prisma.medicoEscalaAgendaExcecao.findMany({
    where: {
      clinicaId,
      medicoId,
      data: {
        gte: inicioDia,
        lte: fimDia,
      },
    },
    orderBy: { horaInicio: "asc" },
  });

  if (excecoes.length > 0) {
    // Excecao com ativo=false bloqueia todo o dia.
    const bloqueioTotal = excecoes.some((item) => !item.ativo && !item.horaInicio && !item.horaFim);
    if (bloqueioTotal) return [];

    return excecoes
      .filter((item) => item.ativo && item.horaInicio && item.horaFim)
      .map((item) => ({
        horaInicio: item.horaInicio!,
        horaFim: item.horaFim!,
      }));
  }

  const diaSemana = getBrazilWeekdayIndex(data);
  const escalas = await prisma.medicoEscalaAgenda.findMany({
    where: {
      clinicaId,
      medicoId,
      diaSemana,
      ativo: true,
    },
    orderBy: { horaInicio: "asc" },
  });

  return escalas.map((item) => ({
    horaInicio: item.horaInicio,
    horaFim: item.horaFim,
  }));
}
