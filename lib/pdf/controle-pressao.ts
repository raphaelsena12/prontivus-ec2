import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawDualSignature,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
  formatCPF,
} from "./pdf-base";

// =====================================================
// INTERFACE COMPARTILHADA
// =====================================================
interface ControlePressaoData extends BaseDocumentData {
  registros?: Array<{
    data: string;
    hora?: string;
    sistolica?: string;
    diastolica?: string;
    frequencia?: string;
    observacao?: string;
  }>;
}

// =====================================================
// 11. CONTROLE DE PRESSÃO ARTERIAL ANALÍTICO
// =====================================================
export function generateControlePressaoAnaliticoPDF(data: ControlePressaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE PRESSÃO ARTERIAL", MARGIN, y);
  y += 8;
  
  // ── Configurações da tabela ──
  const startX = MARGIN;
  const colDataWidth = 55; // Largura da coluna de data
  const colMedicaoWidth = (CONTENT_WIDTH - colDataWidth) / 3; // Largura de cada coluna de medição
  const rowHeight = 4.5; // Altura de cada linha
  const headerYPos = y + 2;
  
  // Posições X das colunas
  const xData = startX;
  const xManha = xData + colDataWidth;
  const xTarde = xManha + colMedicaoWidth;
  const xNoite = xTarde + colMedicaoWidth;
  
  // ── Cabeçalho da tabela ──
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  
  // MANHÃ, TARDE, NOITE centralizados
  doc.text("MANHÃ", xManha + colMedicaoWidth / 2, headerYPos, { align: "center" });
  doc.text("TARDE", xTarde + colMedicaoWidth / 2, headerYPos, { align: "center" });
  doc.text("NOITE", xNoite + colMedicaoWidth / 2, headerYPos, { align: "center" });
  
  y = headerYPos + 5.5; // Quebra de linha após cabeçalhos
  
  // ── Linhas dos dias (01-30) ──
  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  
  for (let dia = 1; dia <= 30; dia++) {
    const diaStr = String(dia).padStart(2, "0");
    
    // Número do dia e campo de data
    doc.text(`${diaStr} - Data`, xData, y);
    // Traços para data
    const tracoDataX = xData + doc.getTextWidth(`${diaStr} - Data `);
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(tracoDataX, y - 1, tracoDataX + 8, y - 1);
    doc.text("/", tracoDataX + 8.5, y);
    doc.line(tracoDataX + 10, y - 1, tracoDataX + 18, y - 1);
    doc.text("/", tracoDataX + 18.5, y);
    doc.line(tracoDataX + 20, y - 1, tracoDataX + 28, y - 1);
    
    // Campos de medição para cada período (MANHÃ, TARDE, NOITE)
    const linhaY = y - 1;
    const tracoXLength = 8; // Traço menor para x
    
    // Função auxiliar para desenhar P.A e x em uma coluna
    const drawPAColumn = (xCol: number, colWidth: number) => {
      doc.setFontSize(6);
      const paX = xCol + 2;
      doc.text("P.A", paX, y);
      
      // Calcular posição do traço P.A (longo)
      const paTracoStartX = paX + doc.getTextWidth("P.A ") + 1;
      const xTextX = xCol + colWidth - doc.getTextWidth("x") - tracoXLength - 2;
      const paTracoEndX = xTextX - 2; // Deixa espaço antes do "x"
      doc.setDrawColor(...COLORS.slate800);
      doc.setLineWidth(0.2);
      doc.line(paTracoStartX, linhaY, paTracoEndX, linhaY);
      
      // Desenhar "x" e seu traço
      doc.text("x", xTextX, y);
      doc.line(xTextX + doc.getTextWidth("x") + 1, linhaY, xTextX + doc.getTextWidth("x") + 1 + tracoXLength, linhaY);
    };
    
    // MANHÃ
    drawPAColumn(xManha, colMedicaoWidth);
    
    // TARDE
    drawPAColumn(xTarde, colMedicaoWidth);
    
    // NOITE
    drawPAColumn(xNoite, colMedicaoWidth);
    
    doc.setFontSize(6.5);
    y += rowHeight;
  }
  
  // ── Assinaturas do paciente e médico ──
  y += 8;
  drawDualSignature(doc, data, y, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 12. CONTROLE DE PRESSÃO ARTERIAL
// =====================================================
export function generateControlePressaoPDF(data: ControlePressaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE PRESSÃO ARTERIAL", MARGIN, y);
  y += 8;
  
  // ── Instrução ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text("VERIFICAR A PRESSÃO 1 VEZ AO DIA EM HORARIOS DIFERENTES", PAGE_WIDTH / 2, y, { align: "center" });
  y += 8;
  
  // ── Configurações da tabela ──
  const startX = MARGIN;
  const colNumWidth = 12; // Largura para número do dia
  const colDataWidth = 45; // Largura para campo de data
  const colHoraWidth = 30; // Largura para campo de hora
  const colPALargura = CONTENT_WIDTH - colNumWidth - colDataWidth - colHoraWidth; // Restante para P.A e x
  const rowHeight = 4.5; // Altura de cada linha
  
  // Posições X das colunas
  const xNum = startX;
  const xData = xNum + colNumWidth;
  const xHora = xData + colDataWidth;
  const xPA = xHora + colHoraWidth;
  
  // ── Linhas dos dias (01-30) ──
  doc.setFontSize(5.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  
  for (let dia = 1; dia <= 30; dia++) {
    const diaStr = String(dia).padStart(2, "0");
    
    // Número do dia
    doc.text(diaStr, xNum, y);
    
    // Campo de data: "Data" + traços __/__/____
    doc.text("Data", xData, y);
    const tracoDataX = xData + doc.getTextWidth("Data ") + 2;
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(tracoDataX, y - 1, tracoDataX + 8, y - 1);
    doc.text("/", tracoDataX + 8.5, y);
    doc.line(tracoDataX + 10, y - 1, tracoDataX + 18, y - 1);
    doc.text("/", tracoDataX + 18.5, y);
    doc.line(tracoDataX + 20, y - 1, tracoDataX + 28, y - 1);
    
    // Campo de hora: "Hora" + traços __:__
    doc.text("Hora", xHora, y);
    const tracoHoraX = xHora + doc.getTextWidth("Hora ") + 2;
    doc.line(tracoHoraX, y - 1, tracoHoraX + 8, y - 1);
    doc.text(":", tracoHoraX + 8.5, y);
    doc.line(tracoHoraX + 10, y - 1, tracoHoraX + 18, y - 1);
    
    // Campo P.A e x
    const linhaY = y - 1;
    doc.setFontSize(6);
    doc.text("P.A", xPA + 2, y);
    const paTracoStartX = xPA + doc.getTextWidth("P.A ") + 2;
    const paTracoLength = colPALargura - 20; // Deixa espaço para o "x"
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.2);
    doc.line(paTracoStartX, linhaY, paTracoStartX + paTracoLength, linhaY);
    
    // Campo "x" com traço
    const xTextX = xPA + colPALargura - doc.getTextWidth("x") - 8;
    doc.text("x", xTextX, y);
    doc.line(xTextX + doc.getTextWidth("x") + 1, linhaY, xTextX + doc.getTextWidth("x") + 1 + 8, linhaY);
    
    doc.setFontSize(5.5);
    y += rowHeight;
  }
  
  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y, { hideDateLine: true });
  return doc.output("arraybuffer");
}
