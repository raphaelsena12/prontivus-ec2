import {
  createDoc,
  drawTopBar,
  drawBottomBar,
  drawClinicHeader,
  formatCPF,
  formatCNPJ,
  COLORS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
} from "./pdf-base";

interface ProntuarioData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;

  dataConsulta: string;

  anamnese: string;
  exameFisico: string;
  diagnostico: string;
  conduta: string;
  evolucao: string;
}

export function generateProntuarioPDF(data: ProntuarioData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  let y = 40;

  // =====================================================
  // TÍTULO "PRONTUÁRIO MÉDICO"
  // =====================================================
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 2, 2, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("PRONTUÁRIO MÉDICO", PAGE_WIDTH / 2, y + 8, { align: "center" });

  y += 18;

  // =====================================================
  // CARD: DADOS DO PACIENTE
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 3, 3, "S");
  
  // Barra lateral decorativa
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, 3, 28, 1, 1, "F");

  const pacienteY = y + 6;
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PACIENTE", MARGIN + 8, pacienteY);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN + 8, pacienteY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CPF: ${formatCPF(data.pacienteCpf)}`, MARGIN + 8, pacienteY + 12);
  doc.text(
    `Data de Nascimento: ${data.pacienteDataNascimento}`,
    MARGIN + 8,
    pacienteY + 18
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data da Consulta:", PAGE_WIDTH - MARGIN - 8, pacienteY + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataConsulta, PAGE_WIDTH - MARGIN - 8, pacienteY + 12, { align: "right" });

  y += 34;

  // =====================================================
  // CARD: DADOS DO MÉDICO
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 3, 3, "S");
  
  // Barra lateral decorativa
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, 3, 18, 1, 1, "F");
  
  const medicoY = y + 6;
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("MÉDICO RESPONSÁVEL", MARGIN + 8, medicoY);
  
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.medicoNome, MARGIN + 8, medicoY + 7);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(
    `CRM ${data.medicoCrm} — ${data.medicoEspecialidade}`,
    MARGIN + 8,
    medicoY + 13
  );

  y += 24;

  // =====================================================
  // ANAMNESE
  // =====================================================
  if (data.anamnese && data.anamnese.trim()) {
    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const anamneseLines = doc.splitTextToSize(data.anamnese, CONTENT_WIDTH - 16);
    const anamneseHeight = Math.max(anamneseLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, anamneseHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, anamneseHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, anamneseHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("ANAMNESE", MARGIN + 8, y + 6);

    let anamneseY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    anamneseLines.forEach((line: string) => {
      if (anamneseY > PAGE_HEIGHT - 30) {
        doc.addPage();
        anamneseY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, anamneseY);
      anamneseY += 4.5;
    });

    y += anamneseHeight + 6;
  }

  // =====================================================
  // EXAME FÍSICO
  // =====================================================
  if (data.exameFisico && data.exameFisico.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const exameLines = doc.splitTextToSize(data.exameFisico, CONTENT_WIDTH - 16);
    const exameHeight = Math.max(exameLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, exameHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, exameHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, exameHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("EXAME FÍSICO", MARGIN + 8, y + 6);

    let exameY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    exameLines.forEach((line: string) => {
      if (exameY > PAGE_HEIGHT - 30) {
        doc.addPage();
        exameY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, exameY);
      exameY += 4.5;
    });

    y += exameHeight + 6;
  }

  // =====================================================
  // DIAGNÓSTICO
  // =====================================================
  if (data.diagnostico && data.diagnostico.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const diagnosticoLines = doc.splitTextToSize(
      data.diagnostico,
      CONTENT_WIDTH - 16
    );
    const diagnosticoHeight = Math.max(diagnosticoLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, diagnosticoHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, diagnosticoHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, diagnosticoHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("DIAGNÓSTICO", MARGIN + 8, y + 6);

    let diagnosticoY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    diagnosticoLines.forEach((line: string) => {
      if (diagnosticoY > PAGE_HEIGHT - 30) {
        doc.addPage();
        diagnosticoY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, diagnosticoY);
      diagnosticoY += 4.5;
    });

    y += diagnosticoHeight + 6;
  }

  // =====================================================
  // CONDUTA
  // =====================================================
  if (data.conduta && data.conduta.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const condutaLines = doc.splitTextToSize(data.conduta, CONTENT_WIDTH - 16);
    const condutaHeight = Math.max(condutaLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, condutaHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, condutaHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, condutaHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("CONDUTA", MARGIN + 8, y + 6);

    let condutaY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    condutaLines.forEach((line: string) => {
      if (condutaY > PAGE_HEIGHT - 30) {
        doc.addPage();
        condutaY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, condutaY);
      condutaY += 4.5;
    });

    y += condutaHeight + 6;
  }

  // =====================================================
  // EVOLUÇÃO
  // =====================================================
  if (data.evolucao && data.evolucao.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const evolucaoLines = doc.splitTextToSize(
      data.evolucao,
      CONTENT_WIDTH - 16
    );
    const evolucaoHeight = Math.max(evolucaoLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, evolucaoHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, evolucaoHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, evolucaoHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("EVOLUÇÃO", MARGIN + 8, y + 6);

    let evolucaoY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    evolucaoLines.forEach((line: string) => {
      if (evolucaoY > PAGE_HEIGHT - 30) {
        doc.addPage();
        evolucaoY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, evolucaoY);
      evolucaoY += 4.5;
    });
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawBottomBar(doc);
  }

  return doc.output("arraybuffer");
}
