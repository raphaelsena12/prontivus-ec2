/**
 * Gerador de PDF para impressão de agenda médica (client-side)
 * Formatos: Diário, Semanal, Mensal, Lista
 *
 * Não importa pdf-base.ts pois este depende de load-inter-font (fs/path/zlib)
 * que não funciona no browser. Usa jsPDF diretamente com helvetica.
 */

import jsPDF from "jspdf";

// ─── Constantes (espelhadas de pdf-base, sem importar) ──────────────────────

const COLORS = {
  slate800: [30, 41, 59] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  blue600: [37, 99, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PDF_FONT = "helvetica";

function createClientDoc(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type FormatoAgenda = "diario" | "semanal" | "mensal" | "lista";

export interface AgendaItem {
  dataHora: Date | string;
  dataHoraFim?: Date | string | null;
  paciente: { nome: string; telefone: string | null };
  status: string;
  tipoConsulta?: { nome: string } | null;
  operadora?: { nomeFantasia: string | null; razaoSocial: string } | null;
  observacoes?: string | null;
}

export interface AgendaPrintOptions {
  formato: FormatoAgenda;
  medicoNome: string;
  data: Date; // Data de referência (dia, início da semana, ou mês)
  agendamentos: AgendaItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmtData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

function fmtHora(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function parseDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    AGENDADA: "Agendado",
    AGENDADO: "Agendado",
    CONFIRMADA: "Confirmado",
    CONFIRMADO: "Confirmado",
    EM_ATENDIMENTO: "Em Atendimento",
    CONCLUIDO: "Concluído",
    CANCELADA: "Cancelado",
    CANCELADO: "Cancelado",
    AGUARDANDO_APROVACAO: "Aguard. Aprovação",
  };
  return map[status] || status.replace(/_/g, " ");
}

function getStartOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=dom
  const diff = d.getDate() - day + 1; // segunda
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfWeek(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ─── Cabeçalho compartilhado ────────────────────────────────────────────────

function drawAgendaHeader(doc: jsPDF, titulo: string, subtitulo: string, medicoNome: string): number {
  let y = 16;

  // Título
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(titulo, MARGIN, y);
  y += 6;

  // Subtítulo (período)
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(subtitulo, MARGIN, y);

  // Médico (direita)
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(medicoNome, PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 4;

  // Separador
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 6;
}

function drawFooter(doc: jsPDF, pageNum: number) {
  const y = PAGE_HEIGHT - 10;
  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate400);
  doc.text(`Impresso em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, MARGIN, y);
  doc.text(`Página ${pageNum}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
}

// ─── Formato DIÁRIO ─────────────────────────────────────────────────────────

function gerarDiario(doc: jsPDF, opts: AgendaPrintOptions): void {
  const dataRef = parseDate(opts.data);
  const diaSemana = DIAS_SEMANA[dataRef.getDay()];
  const titulo = "Agenda Diária";
  const subtitulo = `${diaSemana}, ${fmtData(dataRef)}`;

  const agDia = opts.agendamentos
    .filter((a) => isSameDay(parseDate(a.dataHora), dataRef))
    .sort((a, b) => parseDate(a.dataHora).getTime() - parseDate(b.dataHora).getTime());

  let y = drawAgendaHeader(doc, titulo, subtitulo, opts.medicoNome);
  let page = 1;

  // Cabeçalho da tabela
  const drawTableHeader = () => {
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, "F");
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Horário", MARGIN + 2, y);
    doc.text("Paciente", MARGIN + 25, y);
    doc.text("Telefone", MARGIN + 85, y);
    doc.text("Tipo", MARGIN + 120, y);
    doc.text("Status", MARGIN + 150, y);
    y += 6;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 3, PAGE_WIDTH - MARGIN, y - 3);
  };

  drawTableHeader();

  if (agDia.length === 0) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum agendamento para este dia.", MARGIN + 2, y);
  }

  for (const ag of agDia) {
    if (y > PAGE_HEIGHT - 25) {
      drawFooter(doc, page);
      doc.addPage();
      page++;
      y = 16;
      drawTableHeader();
    }

    const dt = parseDate(ag.dataHora);
    doc.setFontSize(8.5);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(fmtHora(dt), MARGIN + 2, y);

    doc.setFont(PDF_FONT, "normal");
    doc.text(ag.paciente.nome.substring(0, 30), MARGIN + 25, y);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slate600);
    doc.text(ag.paciente.telefone || "-", MARGIN + 85, y);
    doc.text(ag.tipoConsulta?.nome?.substring(0, 15) || "-", MARGIN + 120, y);
    doc.text(getStatusLabel(ag.status), MARGIN + 150, y);

    // Linha separadora leve
    y += 3;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 4;
  }

  drawFooter(doc, page);
}

// ─── Formato SEMANAL ────────────────────────────────────────────────────────

function gerarSemanal(doc: jsPDF, opts: AgendaPrintOptions): void {
  const dataRef = parseDate(opts.data);
  const startWeek = getStartOfWeek(dataRef);
  const endWeek = getEndOfWeek(startWeek);
  const titulo = "Agenda Semanal";
  const subtitulo = `${fmtData(startWeek)} a ${fmtData(endWeek)}`;

  let y = drawAgendaHeader(doc, titulo, subtitulo, opts.medicoNome);
  let page = 1;

  for (let i = 0; i < 7; i++) {
    const dia = new Date(startWeek);
    dia.setDate(dia.getDate() + i);

    const agDia = opts.agendamentos
      .filter((a) => isSameDay(parseDate(a.dataHora), dia))
      .sort((a, b) => parseDate(a.dataHora).getTime() - parseDate(b.dataHora).getTime());

    // Verificar espaço necessário
    const neededSpace = 12 + agDia.length * 5;
    if (y + neededSpace > PAGE_HEIGHT - 20) {
      drawFooter(doc, page);
      doc.addPage();
      page++;
      y = 16;
    }

    // Header do dia
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, "F");
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${DIAS_SEMANA[dia.getDay()]} — ${fmtData(dia)}`, MARGIN + 2, y);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(`${agDia.length} agendamento(s)`, PAGE_WIDTH - MARGIN - 2, y, { align: "right" });
    y += 6;

    if (agDia.length === 0) {
      doc.setFontSize(8);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate400);
      doc.text("— sem agendamentos —", MARGIN + 4, y);
      y += 6;
    } else {
      for (const ag of agDia) {
        if (y > PAGE_HEIGHT - 20) {
          drawFooter(doc, page);
          doc.addPage();
          page++;
          y = 16;
        }

        const dt = parseDate(ag.dataHora);
        doc.setFontSize(8);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(fmtHora(dt), MARGIN + 4, y);

        doc.setFont(PDF_FONT, "normal");
        doc.text(ag.paciente.nome.substring(0, 28), MARGIN + 22, y);

        doc.setTextColor(...COLORS.slate600);
        doc.text(ag.paciente.telefone || "", MARGIN + 90, y);
        doc.text(getStatusLabel(ag.status), MARGIN + 135, y);

        y += 3;
        doc.setDrawColor(...COLORS.slate200);
        doc.setLineWidth(0.1);
        doc.line(MARGIN + 4, y, PAGE_WIDTH - MARGIN, y);
        y += 4;
      }
    }

    // Separador entre dias
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 4;
  }

  drawFooter(doc, page);
}

// ─── Formato MENSAL ─────────────────────────────────────────────────────────

function gerarMensal(doc: jsPDF, opts: AgendaPrintOptions): void {
  const dataRef = parseDate(opts.data);
  const mes = dataRef.getMonth();
  const ano = dataRef.getFullYear();
  const titulo = "Agenda Mensal";
  const subtitulo = `${MESES[mes]} de ${ano}`;

  let y = drawAgendaHeader(doc, titulo, subtitulo, opts.medicoNome);
  let page = 1;

  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  // Iterar cada dia do mês (mesmo layout do semanal)
  for (let d = 1; d <= ultimoDia; d++) {
    const dia = new Date(ano, mes, d);

    const agDia = opts.agendamentos
      .filter((a) => isSameDay(parseDate(a.dataHora), dia))
      .sort((a, b) => parseDate(a.dataHora).getTime() - parseDate(b.dataHora).getTime());

    // Pular dias sem agendamentos
    if (agDia.length === 0) continue;

    // Verificar espaço necessário
    const neededSpace = 12 + agDia.length * 5;
    if (y + neededSpace > PAGE_HEIGHT - 20) {
      drawFooter(doc, page);
      doc.addPage();
      page++;
      y = 16;
    }

    // Header do dia
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, "F");
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${DIAS_SEMANA[dia.getDay()]} — ${fmtData(dia)}`, MARGIN + 2, y);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(`${agDia.length} agendamento(s)`, PAGE_WIDTH - MARGIN - 2, y, { align: "right" });
    y += 6;

    for (const ag of agDia) {
      if (y > PAGE_HEIGHT - 20) {
        drawFooter(doc, page);
        doc.addPage();
        page++;
        y = 16;
      }

      const dt = parseDate(ag.dataHora);
      doc.setFontSize(8);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(fmtHora(dt), MARGIN + 4, y);

      doc.setFont(PDF_FONT, "normal");
      doc.text(ag.paciente.nome.substring(0, 28), MARGIN + 22, y);

      doc.setTextColor(...COLORS.slate600);
      doc.text(ag.paciente.telefone || "", MARGIN + 90, y);
      doc.text(getStatusLabel(ag.status), MARGIN + 135, y);

      y += 3;
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.1);
      doc.line(MARGIN + 4, y, PAGE_WIDTH - MARGIN, y);
      y += 4;
    }

    // Separador entre dias
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 4;
  }

  // Resumo do mês
  if (y < PAGE_HEIGHT - 25) {
    y += 3;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;

    const totalAg = opts.agendamentos.filter((a) => {
      const dt = parseDate(a.dataHora);
      return dt.getMonth() === mes && dt.getFullYear() === ano;
    }).length;
    const confirmados = opts.agendamentos.filter((a) => {
      const dt = parseDate(a.dataHora);
      return dt.getMonth() === mes && dt.getFullYear() === ano && (a.status === "CONFIRMADO" || a.status === "CONFIRMADA");
    }).length;
    const cancelados = opts.agendamentos.filter((a) => {
      const dt = parseDate(a.dataHora);
      return dt.getMonth() === mes && dt.getFullYear() === ano && (a.status === "CANCELADO" || a.status === "CANCELADA");
    }).length;

    doc.setFontSize(8.5);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`Total: ${totalAg} agendamento(s)`, MARGIN + 2, y);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(`Confirmados: ${confirmados}`, MARGIN + 60, y);
    doc.text(`Cancelados: ${cancelados}`, MARGIN + 110, y);
  }

  drawFooter(doc, page);
}

// ─── Formato LISTA ──────────────────────────────────────────────────────────

function gerarLista(doc: jsPDF, opts: AgendaPrintOptions): void {
  const titulo = "Lista de Agendamentos";
  const sorted = [...opts.agendamentos].sort(
    (a, b) => parseDate(a.dataHora).getTime() - parseDate(b.dataHora).getTime()
  );

  let subtitulo = `${sorted.length} agendamento(s)`;
  if (sorted.length > 0) {
    const first = parseDate(sorted[0].dataHora);
    const last = parseDate(sorted[sorted.length - 1].dataHora);
    subtitulo += ` — ${fmtData(first)} a ${fmtData(last)}`;
  }

  let y = drawAgendaHeader(doc, titulo, subtitulo, opts.medicoNome);
  let page = 1;

  // Cabeçalho da tabela
  const drawTableHeader = () => {
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, "F");
    doc.setFontSize(7.5);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Data", MARGIN + 2, y);
    doc.text("Hora", MARGIN + 24, y);
    doc.text("Paciente", MARGIN + 40, y);
    doc.text("Telefone", MARGIN + 90, y);
    doc.text("Convênio", MARGIN + 120, y);
    doc.text("Status", MARGIN + 152, y);
    y += 6;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 3, PAGE_WIDTH - MARGIN, y - 3);
  };

  drawTableHeader();

  if (sorted.length === 0) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum agendamento encontrado.", MARGIN + 2, y);
  }

  for (const ag of sorted) {
    if (y > PAGE_HEIGHT - 25) {
      drawFooter(doc, page);
      doc.addPage();
      page++;
      y = 16;
      drawTableHeader();
    }

    const dt = parseDate(ag.dataHora);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(fmtData(dt), MARGIN + 2, y);

    doc.setFont(PDF_FONT, "bold");
    doc.text(fmtHora(dt), MARGIN + 24, y);

    doc.setFont(PDF_FONT, "normal");
    doc.text(ag.paciente.nome.substring(0, 25), MARGIN + 40, y);

    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate600);
    doc.text(ag.paciente.telefone || "-", MARGIN + 90, y);

    const convenio = ag.operadora?.nomeFantasia || ag.operadora?.razaoSocial || "Particular";
    doc.text(convenio.substring(0, 16), MARGIN + 120, y);

    doc.setFontSize(7.5);
    doc.text(getStatusLabel(ag.status), MARGIN + 152, y);

    y += 3;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 4;
  }

  // Totais
  if (sorted.length > 0 && y < PAGE_HEIGHT - 30) {
    y += 4;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;

    doc.setFontSize(8.5);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`Total: ${sorted.length} agendamento(s)`, MARGIN + 2, y);
  }

  drawFooter(doc, page);
}

// ─── Gerador principal ─────────────────────────────────────────────────────

export function gerarAgendaPdf(opts: AgendaPrintOptions): ArrayBuffer {
  const doc = createClientDoc();

  switch (opts.formato) {
    case "diario":
      gerarDiario(doc, opts);
      break;
    case "semanal":
      gerarSemanal(doc, opts);
      break;
    case "mensal":
      gerarMensal(doc, opts);
      break;
    case "lista":
      gerarLista(doc, opts);
      break;
  }

  return doc.output("arraybuffer");
}
