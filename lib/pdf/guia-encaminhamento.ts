import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawBottomBar,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PAGE_HEIGHT, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface GuiaEncaminhamentoData extends BaseDocumentData {
  encaminharPara?: string;
  procedimentosSolicitados?: string;
  resumoHistoriaClinica?: string;
  hipoteseDiagnostica?: string;
  cidCodigo?: string;
  cidDescricao?: string;
  tipoVaga?: string;
}

// =====================================================
// 16. GUIA DE ENCAMINHAMENTO
// =====================================================
export function generateGuiaEncaminhamentoPDF(data: GuiaEncaminhamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("GUIA DE ENCAMINHAMENTO REFERÊNCIA E CONTRA REFERÊNCIA", MARGIN, y);
  y += 15;
  
  // ── Seção II - PARA (esquerda) e IIII - PROCEDIMENTOS SOLICITADOS (direita) ──
  const midX = PAGE_WIDTH / 2;
  const leftColWidth = CONTENT_WIDTH / 2 - 5;
  const rightColWidth = CONTENT_WIDTH / 2 - 5;
  const sectionStartY = y;
  
  // II - PARA (esquerda)
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("II - PARA", MARGIN, sectionStartY);
  let leftY = sectionStartY + 8;
  
  // Campo para "Para"
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  if (data.encaminharPara) {
    const lines = doc.splitTextToSize(data.encaminharPara, leftColWidth);
    doc.text(lines, MARGIN, leftY);
    leftY += lines.length * 5;
  } else {
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, leftY - 1, MARGIN + leftColWidth, leftY - 1);
    leftY += 6;
  }
  
  // IIII - PROCEDIMENTOS SOLICITADOS (direita) - alinhado no topo
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IIII - PROCEDIMENTOS SOLICITADOS", midX + 5, sectionStartY);
  
  let rightY = sectionStartY + 8;
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  if (data.procedimentosSolicitados) {
    const lines = doc.splitTextToSize(data.procedimentosSolicitados, rightColWidth);
    doc.text(lines, midX + 5, rightY);
    rightY += lines.length * 5;
  } else {
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(midX + 5, rightY - 1, midX + 5 + rightColWidth, rightY - 1);
    rightY += 6;
  }
  
  // Ajustar Y para a próxima seção (usar o maior valor)
  y = Math.max(leftY, rightY) + 12;
  
  // ── IV - Resumo da História Clínica e Exames já Realizados ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IV - Resumo da História Clínica e Exames já Realizados", MARGIN, y);
  y += 10;
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  if (data.resumoHistoriaClinica) {
    const lines = doc.splitTextToSize(data.resumoHistoriaClinica, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 8;
  } else {
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    y += 10;
  }
  
  // ── V - Hipótese Diagnóstica ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("V - Hipótese Diagnóstica", MARGIN, y);
  y += 10;
  
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  if (data.hipoteseDiagnostica) {
    const lines = doc.splitTextToSize(data.hipoteseDiagnostica, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 8;
  } else {
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    y += 10;
  }
  
  // ── Data e Assinatura e Carimbo (primeira vez) ──
  y += 12;
  const sigY1 = y;
  
  // Data
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text("Data", MARGIN, sigY1);
  const dataX = MARGIN + doc.getTextWidth("Data ") + 2;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(dataX, sigY1 - 1, dataX + 8, sigY1 - 1);
  doc.text("/", dataX + 8.5, sigY1);
  doc.line(dataX + 10, sigY1 - 1, dataX + 18, sigY1 - 1);
  doc.text("/", dataX + 18.5, sigY1);
  doc.line(dataX + 20, sigY1 - 1, dataX + 28, sigY1 - 1);
  
  // Assinatura e Carimbo (direita)
  const sigLineX = midX + 20;
  const sigLineWidth = CONTENT_WIDTH / 2 - 10;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(sigLineX, sigY1, sigLineX + sigLineWidth, sigY1);
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Assinatura e Carimbo", sigLineX + sigLineWidth / 2, sigY1 + 6, { align: "center" });
  
  y = sigY1 + 15;
  
  // ── CONTRA REFERÊNCIA ──
  doc.setFontSize(14);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTRA REFERÊNCIA", MARGIN, y);
  y += 10;
  
  // Do e Para
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.text("Do", MARGIN, y);
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  const doLineX = MARGIN + doc.getTextWidth("Do ") + 2;
  doc.line(doLineX, y - 1, doLineX + leftColWidth, y - 1);
  
  doc.text("Para", midX + 5, y);
  const paraLineX = midX + 5 + doc.getTextWidth("Para ") + 2;
  doc.line(paraLineX, y - 1, paraLineX + rightColWidth, y - 1);
  y += 10;
  
  // ── I - Relatório e Orientações ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("I - Relatório e Orientações", MARGIN, y);
  y += 8;
  
  // 5 linhas para relatório
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  for (let i = 0; i < 5; i++) {
    doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    y += 6;
  }
  
  // ── Data e Assinatura e Carimbo (final) ──
  y += 4;
  const sigY2 = y;
  
  // Data
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text("Data", MARGIN, sigY2);
  const dataX2 = MARGIN + doc.getTextWidth("Data ") + 2;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(dataX2, sigY2 - 1, dataX2 + 8, sigY2 - 1);
  doc.text("/", dataX2 + 8.5, sigY2);
  doc.line(dataX2 + 10, sigY2 - 1, dataX2 + 18, sigY2 - 1);
  doc.text("/", dataX2 + 18.5, sigY2);
  doc.line(dataX2 + 20, sigY2 - 1, dataX2 + 28, sigY2 - 1);
  
  // Assinatura e Carimbo (direita)
  const sigLineX2 = midX + 20;
  const sigLineWidth2 = CONTENT_WIDTH / 2 - 10;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(sigLineX2, sigY2, sigLineX2 + sigLineWidth2, sigY2);
  
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Assinatura e Carimbo", sigLineX2 + sigLineWidth2 / 2, sigY2 + 6, { align: "center" });
  
  drawBottomBar(doc, data);
  return doc.output("arraybuffer");
}
