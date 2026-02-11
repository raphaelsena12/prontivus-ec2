import {
  createDoc,
  drawTopBar,
  drawBottomBar,
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

  // =====================================================
  // CABEÇALHO COM LOGO
  // =====================================================
  let y = 10;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, "WEBP", MARGIN, y, 35, 10);
    } catch {
      /* fallback abaixo */
    }
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(
    `${data.clinicaNome} - CNPJ ${formatCNPJ(data.clinicaCnpj)}`,
    MARGIN,
    y + 14
  );
  if (data.clinicaEndereco) {
    doc.text(data.clinicaEndereco, MARGIN, y + 18);
  }

  y += 24;

  // =====================================================
  // TÍTULO "PRONTUÁRIO MÉDICO"
  // =====================================================
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 1, 1, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("PRONTUÁRIO MÉDICO", MARGIN + 5, y + 7);

  y += 16;

  // =====================================================
  // DADOS DO PACIENTE
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 20, 1, 1, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("PACIENTE:", MARGIN + 3, y + 6);

  doc.setFont("helvetica", "normal");
  doc.text(data.pacienteNome, MARGIN + 25, y + 6);
  doc.text(`CPF: ${formatCPF(data.pacienteCpf)}`, MARGIN + 3, y + 11);
  doc.text(
    `Data de Nascimento: ${data.pacienteDataNascimento}`,
    MARGIN + 3,
    y + 16
  );

  doc.setFont("helvetica", "bold");
  doc.text("DATA DA CONSULTA:", PAGE_WIDTH - MARGIN - 50, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.dataConsulta, PAGE_WIDTH - MARGIN - 50, y + 11);

  y += 25;

  // =====================================================
  // DADOS DO MÉDICO
  // =====================================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("MÉDICO RESPONSÁVEL:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${data.medicoNome} - CRM ${data.medicoCrm} - ${data.medicoEspecialidade}`,
    MARGIN,
    y + 5
  );

  y += 12;

  // =====================================================
  // ANAMNESE
  // =====================================================
  if (data.anamnese && data.anamnese.trim()) {
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 6, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("ANAMNESE", MARGIN + 3, y + 4.5);

    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    const anamneseLines = doc.splitTextToSize(data.anamnese, CONTENT_WIDTH - 6);
    anamneseLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + 3, y);
      y += 4;
    });

    y += 5;
  }

  // =====================================================
  // EXAME FÍSICO
  // =====================================================
  if (data.exameFisico && data.exameFisico.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 6, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("EXAME FÍSICO", MARGIN + 3, y + 4.5);

    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    const exameLines = doc.splitTextToSize(data.exameFisico, CONTENT_WIDTH - 6);
    exameLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + 3, y);
      y += 4;
    });

    y += 5;
  }

  // =====================================================
  // DIAGNÓSTICO
  // =====================================================
  if (data.diagnostico && data.diagnostico.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 6, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("DIAGNÓSTICO", MARGIN + 3, y + 4.5);

    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    const diagnosticoLines = doc.splitTextToSize(
      data.diagnostico,
      CONTENT_WIDTH - 6
    );
    diagnosticoLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + 3, y);
      y += 4;
    });

    y += 5;
  }

  // =====================================================
  // CONDUTA
  // =====================================================
  if (data.conduta && data.conduta.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 6, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("CONDUTA", MARGIN + 3, y + 4.5);

    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    const condutaLines = doc.splitTextToSize(data.conduta, CONTENT_WIDTH - 6);
    condutaLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + 3, y);
      y += 4;
    });

    y += 5;
  }

  // =====================================================
  // EVOLUÇÃO
  // =====================================================
  if (data.evolucao && data.evolucao.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 6, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("EVOLUÇÃO", MARGIN + 3, y + 4.5);

    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    const evolucaoLines = doc.splitTextToSize(
      data.evolucao,
      CONTENT_WIDTH - 6
    );
    evolucaoLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + 3, y);
      y += 4;
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
