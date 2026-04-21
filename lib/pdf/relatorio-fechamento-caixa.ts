import jsPDF from "jspdf";
import {
  ClinicaData,
  COLORS,
  MARGIN,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  PDF_FONT,
  createDoc,
  drawClinicHeader,
  checkPageBreak,
} from "./pdf-base";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConsultaResumo {
  dataHora: string | Date;
  paciente: { nome: string };
  operadora?: { nomeFantasia?: string | null; razaoSocial?: string | null } | null;
  planoSaude?: { nome: string } | null;
  tipoConsulta?: { nome: string } | null;
  valorCobrado?: number | null;
}

export interface ResumoFechamentoCaixa {
  data: string;
  clinica?: {
    nome: string;
    cnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    site?: string | null;
  } | null;
  consultas: ConsultaResumo[];
  totalPorFormaPagamento: Record<string, number>;
  totalPorConvenio: Record<string, number>;
  totalGeral: number;
  autorizacao?: {
    medico?: { usuario?: { nome?: string } };
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtTime(isoStr: string | Date): string {
  try {
    return new Date(isoStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtDate(isoStr: string): string {
  try {
    // Tomar apenas a parte da data para evitar problema de fuso
    const [year, month, day] = isoStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

// ─── Tabela genérica ─────────────────────────────────────────────────────────

interface ColDef {
  label: string;
  width: number; // mm
  align?: "left" | "right" | "center";
}

function drawTableHeader(
  doc: jsPDF,
  cols: ColDef[],
  y: number
): number {
  const rowH = 7;
  // Fundo do cabeçalho
  doc.setFillColor(...COLORS.slate800);
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, "F");

  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.white);

  let x = MARGIN + 2;
  for (const col of cols) {
    const textX =
      col.align === "right"
        ? x + col.width - 2
        : col.align === "center"
        ? x + col.width / 2
        : x;
    doc.text(col.label, textX, y + 4.8, {
      align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
    });
    x += col.width;
  }

  return y + rowH;
}

function drawTableRow(
  doc: jsPDF,
  cols: ColDef[],
  values: string[],
  y: number,
  isOdd: boolean
): number {
  const rowH = 6.5;
  if (isOdd) {
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, "F");
  }

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);

  let x = MARGIN + 2;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const val = values[i] ?? "";
    const textX =
      col.align === "right"
        ? x + col.width - 2
        : col.align === "center"
        ? x + col.width / 2
        : x;
    // Truncate se necessário
    const maxW = col.width - 3;
    let text = val;
    if (doc.getTextWidth(text) > maxW) {
      while (text.length > 1 && doc.getTextWidth(text + "…") > maxW) {
        text = text.slice(0, -1);
      }
      text += "…";
    }
    doc.text(text, textX, y + 4.5, {
      align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
    });
    x += col.width;
  }

  // linha separadora inferior leve
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.1);
  doc.line(MARGIN, y + rowH, MARGIN + CONTENT_WIDTH, y + rowH);

  return y + rowH;
}

function drawTotalRow(
  doc: jsPDF,
  label: string,
  value: string,
  y: number
): number {
  const rowH = 7;
  doc.setFillColor(...COLORS.blue600);
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, "F");

  doc.setFontSize(8.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(label, MARGIN + 2, y + 5);
  doc.text(value, MARGIN + CONTENT_WIDTH - 2, y + 5, { align: "right" });

  return y + rowH;
}

// ─── Seção ────────────────────────────────────────────────────────────────────

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(title.toUpperCase(), MARGIN, y);

  return y + 7;
}

// ─── Gerador principal ────────────────────────────────────────────────────────

export function generateRelatorioFechamentoCaixaPDF(
  resumo: ResumoFechamentoCaixa,
  nomeSecretaria: string,
  clinicaData: ClinicaData
): ArrayBuffer {
  const doc = createDoc();

  // ── Cabeçalho com logo ────────────────────────────────────────────────────
  let y = drawClinicHeader(doc, clinicaData);

  // ── Título do documento ───────────────────────────────────────────────────
  const dataFormatada = fmtDate(resumo.data);

  doc.setFontSize(14);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RELATÓRIO FINANCEIRO", PAGE_WIDTH / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Fechamento de Caixa — ${dataFormatada}`, PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 10;

  // ── Consultas Realizadas ──────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 20);
  y = drawSectionTitle(doc, "Consultas Realizadas", y);

  if (resumo.consultas.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhuma consulta registrada para esta data.", MARGIN, y);
    y += 10;
  } else {
    const colsConsultas: ColDef[] = [
      { label: "Hora", width: 18 },
      { label: "Paciente", width: 58 },
      { label: "Convênio / Plano", width: 42 },
      { label: "Tipo", width: 32 },
      { label: "Valor", width: 20, align: "right" },
    ];

    y = drawTableHeader(doc, colsConsultas, y);

    for (let i = 0; i < resumo.consultas.length; i++) {
      y = checkPageBreak(doc, y, 8);
      const c = resumo.consultas[i];
      const hora = fmtTime(c.dataHora);
      const convenio = c.operadora
        ? c.operadora.nomeFantasia || c.operadora.razaoSocial || "—"
        : c.planoSaude
        ? c.planoSaude.nome
        : "Particular";
      const tipo = c.tipoConsulta?.nome || "—";
      const valor =
        c.valorCobrado != null ? fmtCurrency(Number(c.valorCobrado)) : "—";

      y = drawTableRow(
        doc,
        colsConsultas,
        [hora, c.paciente.nome, convenio, tipo, valor],
        y,
        i % 2 === 0
      );
    }
    y += 4;
  }

  // ── Totais (forma de pagamento + convênio + total geral) — fixos acima da assinatura ──
  const entPagamento = Object.entries(resumo.totalPorFormaPagamento);
  const entConvenio = Object.entries(resumo.totalPorConvenio);

  // Calcular altura total do bloco para ancorá-lo acima das assinaturas
  const lineH = 6;
  const blockHeight =
    (5 + 1 + 4 + entPagamento.length * lineH) + // forma de pagamento
    (8 + 5 + 1 + 4 + entConvenio.length * lineH) + // convênio
    (4 + 6); // total geral

  const sigY = PAGE_HEIGHT - 30;
  let by = sigY - 20 - blockHeight; // 20mm de espaço antes das assinaturas

  // Forma de Pagamento
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Forma de Pagamento", MARGIN, by);
  by += 5;
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, by, MARGIN + CONTENT_WIDTH, by);
  by += 4;

  for (const [forma, valor] of entPagamento) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(forma.replace(/_/g, " "), MARGIN, by);
    doc.text(fmtCurrency(valor), MARGIN + CONTENT_WIDTH, by, { align: "right" });
    by += lineH;
  }

  // Convênio
  by += 8;
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Convênio", MARGIN, by);
  by += 5;
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, by, MARGIN + CONTENT_WIDTH, by);
  by += 4;

  for (const [convenio, valor] of entConvenio) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(convenio, MARGIN, by);
    doc.text(fmtCurrency(valor), MARGIN + CONTENT_WIDTH, by, { align: "right" });
    by += lineH;
  }

  // Total Geral
  by += 4;
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, by, MARGIN + CONTENT_WIDTH, by);
  by += 5;
  doc.setFontSize(8.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("Total Geral", MARGIN, by);
  doc.text(fmtCurrency(resumo.totalGeral), MARGIN + CONTENT_WIDTH, by, { align: "right" });

  const leftCenter = MARGIN + CONTENT_WIDTH / 4;
  const rightCenter = MARGIN + (CONTENT_WIDTH * 3) / 4;

  // Traços
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(leftCenter - 35, sigY, leftCenter + 35, sigY);
  doc.line(rightCenter - 35, sigY, rightCenter + 35, sigY);

  // Médico (esquerda)
  const nomeMedico =
    resumo.autorizacao?.medico?.usuario?.nome || "Médico Responsável";
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(nomeMedico, leftCenter, sigY + 6, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Médico Responsável", leftCenter, sigY + 11, { align: "center" });

  // Secretária (direita)
  const nomeSecOk = nomeSecretaria || "Secretária";
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(nomeSecOk, rightCenter, sigY + 6, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Secretária", rightCenter, sigY + 11, { align: "center" });

  return doc.output("arraybuffer");
}
