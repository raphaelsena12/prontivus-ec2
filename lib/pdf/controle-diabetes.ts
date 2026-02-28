import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawDualSignature, drawFooterSignature,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
  formatCPF,
} from "./pdf-base";

// =====================================================
// INTERFACE COMPARTILHADA
// =====================================================
interface ControleDiabetesData extends BaseDocumentData {
  registros?: Array<{
    data: string;
    glicoseJejum?: string;
    glicosePosPrandial?: string;
    insulina?: string;
    observacao?: string;
  }>;
}

// =====================================================
// 9. CONTROLE DE DIABETES ANALÍTICO
// =====================================================
export function generateControleDiabetesAnaliticoPDF(data: ControleDiabetesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data) - 8; // Reduzindo espaço do cabeçalho
  let y = headerY;
  
  // ── Quebra de duas linhas acima do título ──
  y += 11; // Duas quebras de linha
  
  // ── Título (fonte reduzida em 2) ──
  doc.setFontSize(16); // 18 - 2
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE DIABETES", MARGIN, y);
  y += 6; // Reduzido de 7
  
  // ── Subtítulo (fonte reduzida em 2) ──
  doc.setFontSize(8); // 10 - 2
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("*IMPORTANTE- manter jejum de 2 horas antes da verificação", MARGIN, y);
  y += 6; // Reduzido de 5
  
  // ── Dados do paciente (fontes reduzidas em 2) ──
  doc.setFontSize(7); // 9 - 2
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IDENTIFICAÇÃO DO PACIENTE", MARGIN, y);
  y += 6; // Reduzido de 7
  
  const ROW_H = 6; // Reduzido de 7
  const colMid = 75;
  const colDir = 125;
  
  /** Escreve label (cinza, normal 8pt) + valor (escuro, normal 8pt) na posição x, y */
  const lv = (label: string, value: string, x: number, ly: number) => {
    doc.setFontSize(8); // 10 - 2
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(label, x, ly);
    doc.setTextColor(...COLORS.slate800);
    doc.text(value || "", x + doc.getTextWidth(label), ly);
  };
  
  // Linha 1: Nº Matrícula | Nasc. | RG
  lv("Nº Matrícula: ", data.pacienteMatricula || "", MARGIN, y);
  lv("Nasc. ", data.pacienteDataNascimento, colMid, y);
  lv("RG: ", data.pacienteRg || "", colDir, y);
  y += ROW_H;
  
  // Linha 2: Nome | CPF
  lv("Nome: ", data.pacienteNome.toUpperCase(), MARGIN, y);
  lv("CPF: ", formatCPF(data.pacienteCpf), colDir, y);
  y += ROW_H;
  
  // Linha 3: Endereço | Bairro
  lv("Endereço: ", data.pacienteEndereco || "", MARGIN, y);
  lv("Bairro: ", data.pacienteBairro || "", colDir, y);
  y += ROW_H;
  
  // Linha 4: Cidade | CEP
  lv("Cidade: ", data.pacienteCidade || "", MARGIN, y);
  lv("CEP: ", data.pacienteCep || "", colDir, y);
  y += ROW_H + 3; // Reduzido de 4
  
  // Separador
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6; // Reduzido de 8
  
  y -= 3; // Reduzindo espaço adicional após dados do paciente

  // ── Configurações da tabela ──
  const startX = MARGIN;
  const colDataWidth = 55; // Largura da coluna de data
  const colMedicaoWidth = (CONTENT_WIDTH - colDataWidth) / 3; // Largura de cada coluna de medição
  const rowHeight = 4; // Altura de cada linha (reduzida)
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
    
    // Campos de medição (três campos com mg/dL)
    const linhaY = y - 1;
    const tracoWidth = 15; // Largura do traço
    
    // MANHÃ
    doc.line(xManha + 2, linhaY, xManha + 2 + tracoWidth, linhaY);
    doc.setFontSize(5.5);
    doc.text("mg/dL", xManha + colMedicaoWidth - 6, y, { align: "right" });
    
    // TARDE
    doc.setFontSize(6.5);
    doc.line(xTarde + 2, linhaY, xTarde + 2 + tracoWidth, linhaY);
    doc.setFontSize(5.5);
    doc.text("mg/dL", xTarde + colMedicaoWidth - 6, y, { align: "right" });
    
    // NOITE
    doc.setFontSize(6.5);
    doc.line(xNoite + 2, linhaY, xNoite + 2 + tracoWidth, linhaY);
    doc.setFontSize(5.5);
    doc.text("mg/dL", xNoite + colMedicaoWidth - 6, y, { align: "right" });
    
    doc.setFontSize(6.5);
    y += rowHeight;
  }

  // ── Verificação madrugada ──
  y += 2;
  
  // 1º Verificação madrugada
  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.text("1º Verificação madrugada Data", xData, y);
  // Traços para data
  const tracoData1X = xData + doc.getTextWidth("1º Verificação madrugada Data ");
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(tracoData1X, y - 1, tracoData1X + 8, y - 1);
  doc.text("/", tracoData1X + 8.5, y);
  doc.line(tracoData1X + 10, y - 1, tracoData1X + 18, y - 1);
  doc.text("/", tracoData1X + 18.5, y);
  doc.line(tracoData1X + 20, y - 1, tracoData1X + 28, y - 1);
  // Horário fixo 02:30 (na mesma linha, logo após os traços da data)
  const horario1X = tracoData1X + 28 + 3;
  doc.text("hórario 02:30", horario1X, y);
  // Traço para medição NOITE
  const tracoWidth = 15;
  doc.line(xNoite + 2, y - 1, xNoite + 2 + tracoWidth, y - 1);
  doc.setFontSize(5.5);
  doc.text("mg/dL", xNoite + colMedicaoWidth - 6, y, { align: "right" });
  y += rowHeight;

  // 2º Verificação madrugada
  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.text("2º Verificação madrugada Data", xData, y);
  // Traços para data
  const tracoData2X = xData + doc.getTextWidth("2º Verificação madrugada Data ");
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(tracoData2X, y - 1, tracoData2X + 8, y - 1);
  doc.text("/", tracoData2X + 8.5, y);
  doc.line(tracoData2X + 10, y - 1, tracoData2X + 18, y - 1);
  doc.text("/", tracoData2X + 18.5, y);
  doc.line(tracoData2X + 20, y - 1, tracoData2X + 28, y - 1);
  // Horário fixo 02:30 (na mesma linha, logo após os traços da data)
  const horario2X = tracoData2X + 28 + 3;
  doc.text("hórario 02:30", horario2X, y);
  // Traço para medição NOITE
  doc.line(xNoite + 2, y - 1, xNoite + 2 + tracoWidth, y - 1);
  doc.setFontSize(5.5);
  doc.text("mg/dL", xNoite + colMedicaoWidth - 6, y, { align: "right" });

  // ── Quebra de linha acima das assinaturas ──
  y += 11; // Duas quebras de linha

  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 10. CONTROLE DE DIABETES
// =====================================================
export function generateControleDiabetesPDF(data: ControleDiabetesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE DIABETES", MARGIN, y);
  y += 7;
  
  // ── Subtítulo ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("*IMPORTANTE- manter jejum de 2 horas antes da verificação", MARGIN, y);
  y += 8;
  
  // ── Configurações da tabela ──
  const startX = MARGIN;
  const colNumWidth = 12; // Largura para número do dia
  const colDataWidth = 45; // Largura para campo de data
  const colHoraWidth = 30; // Largura para campo de hora
  const colMedicaoWidth = CONTENT_WIDTH - colNumWidth - colDataWidth - colHoraWidth; // Restante para medição
  const rowHeight = 4.5; // Altura de cada linha (reduzido para menor espaçamento)
  
  // Posições X das colunas
  const xNum = startX;
  const xData = xNum + colNumWidth;
  const xHora = xData + colDataWidth;
  const xMedicao = xHora + colHoraWidth;
  
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
    
    // Campo de medição: traço + mg/dL
    const tracoMedicaoX = xMedicao + 2;
    const tracoMedicaoWidth = colMedicaoWidth - 20; // Deixa espaço para mg/dL
    doc.line(tracoMedicaoX, y - 1, tracoMedicaoX + tracoMedicaoWidth, y - 1);
    doc.setFontSize(5);
    doc.text("mg/dL", xMedicao + colMedicaoWidth - 6, y, { align: "right" });
    
    doc.setFontSize(5.5);
    y += rowHeight;
  }
  
  // ── Verificação madrugada ──
  y += 4;
  
  // 1º Verificação madrugada
  doc.setFontSize(5.5);
  doc.setFont(PDF_FONT, "normal");
  doc.text("1º Verificação madrugada Data", xData, y);
  // Traços para data
  const tracoData1X = xData + doc.getTextWidth("1º Verificação madrugada Data ") + 2;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(tracoData1X, y - 1, tracoData1X + 8, y - 1);
  doc.text("/", tracoData1X + 8.5, y);
  doc.line(tracoData1X + 10, y - 1, tracoData1X + 18, y - 1);
  doc.text("/", tracoData1X + 18.5, y);
  doc.line(tracoData1X + 20, y - 1, tracoData1X + 28, y - 1);
  // Horário fixo 02:30 (na mesma linha, logo após os traços da data)
  const horario1X = tracoData1X + 28 + 3;
  doc.text("hórario 02:30", horario1X, y);
  // Traço para medição
  const tracoMedicao1X = xMedicao + 2;
  const tracoMedicao1Width = colMedicaoWidth - 20;
  doc.line(tracoMedicao1X, y - 1, tracoMedicao1X + tracoMedicao1Width, y - 1);
  doc.setFontSize(5);
  doc.text("mg/dL", xMedicao + colMedicaoWidth - 6, y, { align: "right" });
  y += rowHeight;
  
  // 2º Verificação madrugada
  doc.setFontSize(5.5);
  doc.setFont(PDF_FONT, "normal");
  doc.text("2º Verificação madrugada Data", xData, y);
  // Traços para data
  const tracoData2X = xData + doc.getTextWidth("2º Verificação madrugada Data ") + 2;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(tracoData2X, y - 1, tracoData2X + 8, y - 1);
  doc.text("/", tracoData2X + 8.5, y);
  doc.line(tracoData2X + 10, y - 1, tracoData2X + 18, y - 1);
  doc.text("/", tracoData2X + 18.5, y);
  doc.line(tracoData2X + 20, y - 1, tracoData2X + 28, y - 1);
  // Horário fixo 02:30 (na mesma linha, logo após os traços da data)
  const horario2X = tracoData2X + 28 + 3;
  doc.text("hórario 02:30", horario2X, y);
  // Traço para medição
  const tracoMedicao2X = xMedicao + 2;
  const tracoMedicao2Width = colMedicaoWidth - 20;
  doc.line(tracoMedicao2X, y - 1, tracoMedicao2X + tracoMedicao2Width, y - 1);
  doc.setFontSize(5);
  doc.text("mg/dL", xMedicao + colMedicaoWidth - 6, y, { align: "right" });
  
  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y, { hideDateLine: true });
  return doc.output("arraybuffer");
}
