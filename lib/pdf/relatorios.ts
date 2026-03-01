/**
 * Geradores de relatórios PDF para Admin Clínica
 * Usa jsPDF + pdf-base utilities
 */

import jsPDF from "jspdf";
import {
  COLORS,
  MARGIN,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  createDoc,
  PDF_FONT,
  formatCNPJ,
} from "./pdf-base";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type TipoRelatorio =
  | "faturamento"
  | "vendas"
  | "faturamento-medico"
  | "estoque"
  | "contas-pagar"
  | "contas-receber";

export interface ClinicaInfo {
  nome: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  logo?: { data: string; format: string };
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

// Cor uniforme para todos os tipos (slate-600)
const GRAY: [number, number, number] = [71, 85, 105];
const ACCENT: Record<TipoRelatorio, [number, number, number]> = {
  faturamento: GRAY,
  vendas: GRAY,
  "faturamento-medico": GRAY,
  estoque: GRAY,
  "contas-pagar": GRAY,
  "contas-receber": GRAY,
};

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

function fmtPeriodo(inicio: string, fim: string): string {
  return `${fmtDate(inicio)} a ${fmtDate(fim)}`;
}

/** Cabeçalho padrão dos relatórios */
function drawHeader(
  doc: jsPDF,
  titulo: string,
  clinica: ClinicaInfo,
  inicio: string,
  fim: string,
  tipo: TipoRelatorio
): number {
  const cor = ACCENT[tipo];

  // Logo da clínica (canto superior direito)
  if (clinica.logo) {
    try {
      const mime =
        clinica.logo.format === "PNG" ? "image/png"
        : clinica.logo.format === "WEBP" ? "image/webp"
        : "image/jpeg";
      const dataUrl = `data:${mime};base64,${clinica.logo.data}`;
      const logoW = 32;
      const logoH = 16;
      const logoX = PAGE_WIDTH - MARGIN - logoW;
      doc.addImage(dataUrl, clinica.logo.format, logoX, 8, logoW, logoH);
    } catch (e) {
      console.warn("[PDF] addImage falhou:", e);
    }
  }

  // Nome da clínica
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.slate800);
  doc.text(clinica.nome, MARGIN, 20);

  // CNPJ e contato
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate400);
  const info = [
    clinica.cnpj ? `CNPJ: ${formatCNPJ(clinica.cnpj)}` : null,
    clinica.telefone || null,
    clinica.email || null,
    clinica.cidade && clinica.estado ? `${clinica.cidade} — ${clinica.estado}` : null,
  ]
    .filter(Boolean)
    .join("   |   ");
  doc.text(info, MARGIN, 26);

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 30, PAGE_WIDTH - MARGIN, 30);

  // Título do relatório
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...cor);
  doc.text(titulo, MARGIN, 40);

  // Período
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Período: ${fmtPeriodo(inicio, fim)}`, MARGIN, 47);

  // Data de geração (direita)
  const geradoEm = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;
  const geradoW = doc.getTextWidth(geradoEm);
  doc.text(geradoEm, PAGE_WIDTH - MARGIN - geradoW, 47);

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.line(MARGIN, 51, PAGE_WIDTH - MARGIN, 51);

  return 58; // próxima posição Y
}

/** Rodapé com número de página */
function drawFooter(doc: jsPDF, tipo: TipoRelatorio): void {
  const total = (doc as any).internal.getNumberOfPages();
  const cor = ACCENT[tipo];

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    // Linha acima do rodapé
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_HEIGHT - 14, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 14);

    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate400);
    doc.text("Prontivus — Sistema de Gestão Clínica", MARGIN, PAGE_HEIGHT - 8);

    const pageText = `Página ${i} / ${total}`;
    const pageW = doc.getTextWidth(pageText);
    doc.setTextColor(...cor);
    doc.setFont(PDF_FONT, "bold");
    doc.text(pageText, PAGE_WIDTH - MARGIN - pageW, PAGE_HEIGHT - 8);
  }
}

// ─── Table helpers ───────────────────────────────────────────────────────────

interface ColDef {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

/** Trunca texto para caber na largura máxima da coluna (com padding) */
function truncateCell(doc: jsPDF, text: string, maxWidth: number, padding = 2): string {
  const available = maxWidth - padding * 2;
  if (doc.getTextWidth(text) <= available) return text;
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + "…") > available) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

function drawTable(
  doc: jsPDF,
  cols: ColDef[],
  rows: string[][],
  startY: number,
  tipo: TipoRelatorio,
  summaryRow?: string[]
): number {
  const cor = ACCENT[tipo];
  const rowH = 6.5;
  const headerH = 7.5;
  let y = startY;

  // Header row
  doc.setFillColor(...cor);
  doc.rect(MARGIN, y, CONTENT_WIDTH, headerH, "F");

  let x = MARGIN;
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  for (const col of cols) {
    const label = truncateCell(doc, col.header, col.width);
    const tx =
      col.align === "right"
        ? x + col.width - 2
        : col.align === "center"
        ? x + col.width / 2
        : x + 2;
    doc.text(label, tx, y + 5, {
      align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
    });
    x += col.width;
  }
  y += headerH;

  // Empty state
  if (rows.length === 0) {
    const emptyH = 12;
    doc.setFillColor(...COLORS.slate50);
    doc.rect(MARGIN, y, CONTENT_WIDTH, emptyH, "F");
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum dado encontrado para o período selecionado.", MARGIN + CONTENT_WIDTH / 2, y + 7.5, { align: "center" });
    return y + emptyH + 4;
  }

  // Data rows
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(6.5);

  for (let ri = 0; ri < rows.length; ri++) {
    // New page if needed
    if (y + rowH > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = MARGIN + 5;
    }

    // Zebra stripe
    if (ri % 2 === 0) {
      doc.setFillColor(...COLORS.slate50);
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, "F");
    }

    x = MARGIN;
    doc.setTextColor(...COLORS.slate800);
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      const raw = rows[ri][ci] ?? "";
      const cell = truncateCell(doc, raw, col.width);
      const tx =
        col.align === "right"
          ? x + col.width - 2
          : col.align === "center"
          ? x + col.width / 2
          : x + 2;
      doc.text(cell, tx, y + 4.5, {
        align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
      });
      x += col.width;
    }

    // Row border
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_WIDTH, y + rowH);

    y += rowH;
  }

  // Summary row
  if (summaryRow) {
    if (y + rowH + 2 > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = MARGIN + 5;
    }
    doc.setFillColor(...COLORS.slate200);
    doc.rect(MARGIN, y + 1, CONTENT_WIDTH, rowH, "F");

    x = MARGIN;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...cor);
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      const cell = summaryRow[ci] ?? "";
      const tx =
        col.align === "right"
          ? x + col.width - 2
          : col.align === "center"
          ? x + col.width / 2
          : x + 2;
      doc.text(cell, tx, y + 5.5, {
        align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left",
      });
      x += col.width;
    }
    y += rowH + 1;
  }

  return y + 4;
}

/** KPI summary cards at top */
function drawKpiRow(
  doc: jsPDF,
  kpis: { label: string; value: string }[],
  y: number,
  tipo: TipoRelatorio
): number {
  const cor = ACCENT[tipo];
  const cardW = CONTENT_WIDTH / kpis.length;
  const cardH = 16;

  for (let i = 0; i < kpis.length; i++) {
    const x = MARGIN + i * cardW;
    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(x + 1, y, cardW - 2, cardH, 2, 2, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 1, y, cardW - 2, cardH, 2, 2, "S");

    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slate400);
    doc.text(kpis[i].label, x + 6, y + 6);

    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.slate800);
    doc.text(kpis[i].value, x + 6, y + 13);
  }

  return y + cardH + 6;
}

// ─── Report generators ───────────────────────────────────────────────────────

// 1. Faturamento
export interface FaturamentoData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  consultas: {
    id: string;
    data: Date;
    paciente: string;
    medico: string;
    procedimento: string;
    operadora: string | null;
    valorCobrado: number;
  }[];
}

export function gerarRelatorioFaturamento(data: FaturamentoData): Buffer {
  const doc = createDoc();
  let y = drawHeader(doc, "Relatório de Faturamento", data.clinica, data.inicio, data.fim, "faturamento");

  const total = data.consultas.reduce((s, c) => s + c.valorCobrado, 0);
  const particular = data.consultas.filter((c) => !c.operadora).reduce((s, c) => s + c.valorCobrado, 0);
  const convenio = total - particular;

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Consultas", value: String(data.consultas.length) },
      { label: "Faturamento Total", value: `R$ ${fmtCurrency(total)}` },
      { label: "Particular", value: `R$ ${fmtCurrency(particular)}` },
      { label: "Convênio", value: `R$ ${fmtCurrency(convenio)}` },
    ],
    y,
    "faturamento"
  );

  const cols: ColDef[] = [
    { header: "Data", width: 18 },
    { header: "Paciente", width: 38 },
    { header: "Médico", width: 34 },
    { header: "Procedimento", width: 34 },
    { header: "Convênio", width: 20 },
    { header: "Valor (R$)", width: 26, align: "right" },
  ];

  const rows = data.consultas.map((c) => [
    fmtDate(c.data),
    c.paciente,
    c.medico,
    c.procedimento || "—",
    c.operadora || "Particular",
    fmtCurrency(c.valorCobrado),
  ]);

  y = drawTable(doc, cols, rows, y, "faturamento", [
    "TOTAL",
    "",
    "",
    "",
    "",
    fmtCurrency(total),
  ]);

  drawFooter(doc, "faturamento");
  return Buffer.from(doc.output("arraybuffer"));
}

// 2. Vendas
export interface VendasData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  consultas: {
    id: string;
    data: Date;
    paciente: string;
    medico: string;
    status: string;
    operadora: string | null;
    valorCobrado: number;
  }[];
}

export function gerarRelatorioVendas(data: VendasData): Buffer {
  const doc = createDoc();
  let y = drawHeader(doc, "Relatório de Vendas", data.clinica, data.inicio, data.fim, "vendas");

  const realizadas = data.consultas.filter((c) => c.status === "REALIZADA").length;
  const agendadas = data.consultas.filter((c) => c.status === "AGENDADA").length;
  const canceladas = data.consultas.filter((c) => c.status === "CANCELADA").length;
  const total = data.consultas.reduce((s, c) => s + c.valorCobrado, 0);

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Consultas", value: String(data.consultas.length) },
      { label: "Realizadas", value: String(realizadas) },
      { label: "Agendadas", value: String(agendadas) },
      { label: "Canceladas", value: String(canceladas) },
    ],
    y,
    "vendas"
  );

  const cols: ColDef[] = [
    { header: "Data", width: 18 },
    { header: "Paciente", width: 40 },
    { header: "Médico", width: 35 },
    { header: "Status", width: 22 },
    { header: "Convênio", width: 27 },
    { header: "Valor (R$)", width: 28, align: "right" },
  ];

  const STATUS_LABEL: Record<string, string> = {
    REALIZADA: "Realizada",
    AGENDADA: "Agendada",
    CANCELADA: "Cancelada",
    CONFIRMADA: "Confirmada",
    EM_ATENDIMENTO: "Em Atendimento",
  };

  const rows = data.consultas.map((c) => [
    fmtDate(c.data),
    c.paciente,
    c.medico,
    STATUS_LABEL[c.status] || c.status,
    c.operadora || "Particular",
    fmtCurrency(c.valorCobrado),
  ]);

  y = drawTable(doc, cols, rows, y, "vendas", [
    "TOTAL",
    "",
    "",
    "",
    "",
    fmtCurrency(total),
  ]);

  drawFooter(doc, "vendas");
  return Buffer.from(doc.output("arraybuffer"));
}

// 3. Faturamento por Médico
export interface FaturamentoMedicoData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  medicos: {
    medicoId: string;
    nome: string;
    especialidade: string;
    totalConsultas: number;
    valorTotal: number;
    valorRepasse: number;
    consultas: { data: Date; paciente: string; valorCobrado: number; valorRepassado: number }[];
  }[];
}

export function gerarRelatorioFaturamentoMedico(data: FaturamentoMedicoData): Buffer {
  const doc = createDoc();
  let y = drawHeader(
    doc,
    "Relatório de Faturamento por Médico",
    data.clinica,
    data.inicio,
    data.fim,
    "faturamento-medico"
  );

  const totalGeral = data.medicos.reduce((s, m) => s + m.valorTotal, 0);
  const totalRepasse = data.medicos.reduce((s, m) => s + m.valorRepasse, 0);
  const totalConsultas = data.medicos.reduce((s, m) => s + m.totalConsultas, 0);

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Médicos", value: String(data.medicos.length) },
      { label: "Total de Consultas", value: String(totalConsultas) },
      { label: "Faturamento Total", value: `R$ ${fmtCurrency(totalGeral)}` },
      { label: "Total de Repasses", value: `R$ ${fmtCurrency(totalRepasse)}` },
    ],
    y,
    "faturamento-medico"
  );

  // Summary table per doctor
  const summCols: ColDef[] = [
    { header: "Médico", width: 50 },
    { header: "Especialidade", width: 38 },
    { header: "Consultas", width: 20, align: "center" },
    { header: "Faturamento (R$)", width: 34, align: "right" },
    { header: "Repasse (R$)", width: 28, align: "right" },
  ];

  const summRows = data.medicos.map((m) => [
    m.nome,
    m.especialidade || "—",
    String(m.totalConsultas),
    fmtCurrency(m.valorTotal),
    fmtCurrency(m.valorRepasse),
  ]);

  y = drawTable(doc, summCols, summRows, y, "faturamento-medico", [
    "TOTAL GERAL",
    "",
    String(totalConsultas),
    fmtCurrency(totalGeral),
    fmtCurrency(totalRepasse),
  ]);

  // Detail per doctor
  for (const medico of data.medicos) {
    if (y + 20 > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = MARGIN + 5;
    }

    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT["faturamento-medico"]);
    doc.text(`${medico.nome} — ${medico.especialidade || "Clínica Geral"}`, MARGIN, y + 5);
    y += 9;

    const detCols: ColDef[] = [
      { header: "Data", width: 22 },
      { header: "Paciente", width: 78 },
      { header: "Valor Cobrado (R$)", width: 38, align: "right" },
      { header: "Repasse (R$)", width: 32, align: "right" },
    ];

    const detRows = medico.consultas.map((c) => [
      fmtDate(c.data),
      c.paciente,
      fmtCurrency(c.valorCobrado),
      fmtCurrency(c.valorRepassado),
    ]);

    y = drawTable(doc, detCols, detRows, y, "faturamento-medico", [
      "Subtotal",
      "",
      fmtCurrency(medico.valorTotal),
      fmtCurrency(medico.valorRepasse),
    ]);

    y += 4;
  }

  drawFooter(doc, "faturamento-medico");
  return Buffer.from(doc.output("arraybuffer"));
}

// 4. Estoque (Movimentação)
export interface EstoqueData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  movimentacoes: {
    id: string;
    data: Date;
    tipoEstoque: string;
    item: string;
    tipo: string;
    quantidade: number;
    motivo: string | null;
    observacoes: string | null;
  }[];
}

export function gerarRelatorioEstoque(data: EstoqueData): Buffer {
  const doc = createDoc();
  let y = drawHeader(
    doc,
    "Relatório de Estoque (Movimentação)",
    data.clinica,
    data.inicio,
    data.fim,
    "estoque"
  );

  const entradas = data.movimentacoes.filter((m) => m.tipo === "ENTRADA");
  const saidas = data.movimentacoes.filter((m) => m.tipo === "SAIDA");
  const medicamentos = data.movimentacoes.filter((m) => m.tipoEstoque === "MEDICAMENTO").length;
  const insumos = data.movimentacoes.filter((m) => m.tipoEstoque === "INSUMO").length;

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Movimentações", value: String(data.movimentacoes.length) },
      { label: "Entradas", value: String(entradas.length) },
      { label: "Saídas", value: String(saidas.length) },
      { label: "Medicamentos / Insumos", value: `${medicamentos} / ${insumos}` },
    ],
    y,
    "estoque"
  );

  const cols: ColDef[] = [
    { header: "Data", width: 20 },
    { header: "Tipo", width: 16, align: "center" },
    { header: "Categoria", width: 20 },
    { header: "Item", width: 52 },
    { header: "Qtd", width: 18, align: "center" },
    { header: "Motivo / Observações", width: 44 },
  ];

  const rows = data.movimentacoes.map((m) => [
    fmtDate(m.data),
    m.tipo === "ENTRADA" ? "Entrada" : "Saída",
    m.tipoEstoque === "MEDICAMENTO" ? "Medicamento" : "Insumo",
    m.item,
    String(m.quantidade),
    m.motivo || m.observacoes || "—",
  ]);

  y = drawTable(doc, cols, rows, y, "estoque");

  drawFooter(doc, "estoque");
  return Buffer.from(doc.output("arraybuffer"));
}

// 5. Contas a Pagar
export interface ContasPagarData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  contas: {
    id: string;
    descricao: string;
    fornecedor: string | null;
    valor: number;
    dataVencimento: Date;
    dataPagamento: Date | null;
    status: string;
    observacoes: string | null;
  }[];
}

export function gerarRelatorioContasPagar(data: ContasPagarData): Buffer {
  const doc = createDoc();
  let y = drawHeader(
    doc,
    "Relatório de Contas a Pagar",
    data.clinica,
    data.inicio,
    data.fim,
    "contas-pagar"
  );

  const total = data.contas.reduce((s, c) => s + c.valor, 0);
  const pagas = data.contas.filter((c) => c.status === "PAGO");
  const pendentes = data.contas.filter((c) => c.status === "PENDENTE");
  const vencidas = data.contas.filter((c) => c.status === "VENCIDO");

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Contas", value: String(data.contas.length) },
      { label: "Pagas", value: `${pagas.length} — R$ ${fmtCurrency(pagas.reduce((s, c) => s + c.valor, 0))}` },
      { label: "Pendentes", value: `${pendentes.length} — R$ ${fmtCurrency(pendentes.reduce((s, c) => s + c.valor, 0))}` },
      { label: "Vencidas", value: `${vencidas.length} — R$ ${fmtCurrency(vencidas.reduce((s, c) => s + c.valor, 0))}` },
    ],
    y,
    "contas-pagar"
  );

  const cols: ColDef[] = [
    { header: "Descrição", width: 44 },
    { header: "Fornecedor", width: 32 },
    { header: "Vencimento", width: 20 },
    { header: "Pagamento", width: 20 },
    { header: "Status", width: 20 },
    { header: "Valor (R$)", width: 34, align: "right" },
  ];

  const STATUS_LABEL: Record<string, string> = {
    PAGO: "Pago",
    PENDENTE: "Pendente",
    VENCIDO: "Vencido",
    CANCELADO: "Cancelado",
  };

  const rows = data.contas.map((c) => [
    c.descricao,
    c.fornecedor || "—",
    fmtDate(c.dataVencimento),
    c.dataPagamento ? fmtDate(c.dataPagamento) : "—",
    STATUS_LABEL[c.status] || c.status,
    fmtCurrency(c.valor),
  ]);

  y = drawTable(doc, cols, rows, y, "contas-pagar", [
    "TOTAL",
    "",
    "",
    "",
    "",
    fmtCurrency(total),
  ]);

  drawFooter(doc, "contas-pagar");
  return Buffer.from(doc.output("arraybuffer"));
}

// 6. Contas a Receber
export interface ContasReceberData {
  clinica: ClinicaInfo;
  inicio: string;
  fim: string;
  contas: {
    id: string;
    descricao: string;
    paciente: string | null;
    valor: number;
    dataVencimento: Date;
    dataRecebimento: Date | null;
    status: string;
    observacoes: string | null;
  }[];
}

export function gerarRelatorioContasReceber(data: ContasReceberData): Buffer {
  const doc = createDoc();
  let y = drawHeader(
    doc,
    "Relatório de Contas a Receber",
    data.clinica,
    data.inicio,
    data.fim,
    "contas-receber"
  );

  const total = data.contas.reduce((s, c) => s + c.valor, 0);
  const recebidas = data.contas.filter((c) => c.status === "RECEBIDO");
  const pendentes = data.contas.filter((c) => c.status === "PENDENTE");
  const vencidas = data.contas.filter((c) => c.status === "VENCIDO");

  y = drawKpiRow(
    doc,
    [
      { label: "Total de Contas", value: String(data.contas.length) },
      { label: "Recebidas", value: `${recebidas.length} — R$ ${fmtCurrency(recebidas.reduce((s, c) => s + c.valor, 0))}` },
      { label: "Pendentes", value: `${pendentes.length} — R$ ${fmtCurrency(pendentes.reduce((s, c) => s + c.valor, 0))}` },
      { label: "Vencidas", value: `${vencidas.length} — R$ ${fmtCurrency(vencidas.reduce((s, c) => s + c.valor, 0))}` },
    ],
    y,
    "contas-receber"
  );

  const cols: ColDef[] = [
    { header: "Descrição", width: 44 },
    { header: "Paciente", width: 32 },
    { header: "Vencimento", width: 20 },
    { header: "Recebimento", width: 20 },
    { header: "Status", width: 20 },
    { header: "Valor (R$)", width: 34, align: "right" },
  ];

  const STATUS_LABEL: Record<string, string> = {
    RECEBIDO: "Recebido",
    PENDENTE: "Pendente",
    VENCIDO: "Vencido",
    CANCELADO: "Cancelado",
  };

  const rows = data.contas.map((c) => [
    c.descricao,
    c.paciente || "—",
    fmtDate(c.dataVencimento),
    c.dataRecebimento ? fmtDate(c.dataRecebimento) : "—",
    STATUS_LABEL[c.status] || c.status,
    fmtCurrency(c.valor),
  ]);

  y = drawTable(doc, cols, rows, y, "contas-receber", [
    "TOTAL",
    "",
    "",
    "",
    "",
    fmtCurrency(total),
  ]);

  drawFooter(doc, "contas-receber");
  return Buffer.from(doc.output("arraybuffer"));
}
