/**
 * Utilitários para fuso horário Brasil (America/Sao_Paulo, UTC-3)
 * Todas as datas armazenadas no banco são UTC.
 * Funções aqui convertem datas "do usuário Brasil" para UTC correto.
 */

const BRAZIL_TZ = "America/Sao_Paulo";

/** "YYYY-MM-DD" → início do dia no Brasil como UTC */
export function brazilDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

/** "YYYY-MM-DD" → fim do dia no Brasil como UTC */
export function brazilDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59-03:00`);
}

/** Data atual no Brasil como "YYYY-MM-DD" */
export function brazilToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: BRAZIL_TZ }).format(new Date());
}

/** Início de hoje no Brasil como UTC */
export function brazilTodayStart(): Date {
  return brazilDayStart(brazilToday());
}

/** Início de amanhã no Brasil como UTC */
export function brazilTomorrowStart(): Date {
  const [year, month, day] = brazilToday().split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return brazilDayStart(next.toISOString().split("T")[0]);
}

/** Horas e minutos de um Date no fuso Brasil */
export function getBrazilHourMinute(date: Date): { hours: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  return {
    hours: parseInt(parts.find((p) => p.type === "hour")?.value ?? "0"),
    minutes: parseInt(parts.find((p) => p.type === "minute")?.value ?? "0"),
  };
}

/** Cria um Date para data+hora no fuso Brasil */
export function brazilDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00-03:00`);
}

/** Fim de hoje no Brasil como UTC (23:59:59) */
export function brazilTodayEnd(): Date {
  return brazilDayEnd(brazilToday());
}

/** Início do mês atual no Brasil como UTC */
export function brazilMonthStart(): Date {
  const [year, month] = brazilToday().split("-").map(Number);
  return brazilDayStart(`${year}-${String(month).padStart(2, "0")}-01`);
}

/** Início de N meses atrás no Brasil como UTC */
export function brazilNMonthsAgoStart(n: number): Date {
  const [year, month] = brazilToday().split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 - n, 1));
  return brazilDayStart(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
}

/** Data de hoje formatada no Brasil: DD/MM/YYYY */
export function brazilTodayFormatted(): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: BRAZIL_TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

export type DateFilter = "diario" | "mensal" | "anual";

/** Retorna o range de datas baseado no filtro selecionado */
export function getDateRangeFromFilter(filter: DateFilter): { start: Date; end: Date } {
  const hoje = brazilToday();
  const [year, month, day] = hoje.split("-").map(Number);
  const hojeDate = new Date(Date.UTC(year, month - 1, day));
  
  let start: Date;
  let end: Date = brazilTodayEnd();

  switch (filter) {
    case "diario": {
      // Apenas hoje
      start = brazilTodayStart();
      break;
    }
    case "mensal": {
      // Mês atual
      start = brazilMonthStart();
      break;
    }
    case "anual": {
      // Ano atual (desde 1º de janeiro)
      start = brazilDayStart(`${year}-01-01`);
      break;
    }
    default: {
      start = brazilMonthStart();
    }
  }

  return { start, end };
}
