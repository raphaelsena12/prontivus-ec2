import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, checkPageBreak,
  MARGIN, CONTENT_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface ProntuarioData extends BaseDocumentData {
  dataConsulta: string;
  anamnese?: string;
  exameFisico?: string;
  diagnostico?: string;
  conduta?: string;
  orientacoesConduta?: string;
  orientacoes?: string;
  evolucao?: string;
}

// =====================================================
// HELPERS
// =====================================================
function drawSection(
  doc: ReturnType<typeof createDoc>,
  title: string,
  content: string,
  y: number,
): number {
  y = checkPageBreak(doc, y, 14);
  doc.setFontSize(8.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, MARGIN, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  const lines = doc.splitTextToSize(content, CONTENT_WIDTH - 4);
  for (const line of lines) {
    y = checkPageBreak(doc, y, 4);
    doc.text(line, MARGIN + 2, y);
    y += 4;
  }
  y += 4;
  return y;
}

// =====================================================
// PRONTUÁRIO MÉDICO
// =====================================================
export function generateProntuarioPDF(data: ProntuarioData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "PRONTUÁRIO MÉDICO", `Consulta: ${data.dataConsulta}`, headerY);
  y = drawPatientCard(doc, data, y);

  if (data.anamnese?.trim()) {
    y = drawSection(doc, "ANAMNESE", data.anamnese, y);
  }
  if (data.exameFisico?.trim()) {
    y = drawSection(doc, "EXAME FÍSICO", data.exameFisico, y);
  }
  if (data.diagnostico?.trim()) {
    y = drawSection(doc, "DIAGNÓSTICO", data.diagnostico, y);
  }
  if (data.conduta?.trim()) {
    y = drawSection(doc, "CONDUTA", data.conduta, y);
  }
  if (data.orientacoesConduta?.trim()) {
    y = drawSection(doc, "ORIENTAÇÕES DE CONDUTA", data.orientacoesConduta, y);
  }
  if (data.orientacoes?.trim()) {
    y = drawSection(doc, "ORIENTAÇÕES", data.orientacoes, y);
  }
  if (data.evolucao?.trim()) {
    y = drawSection(doc, "EVOLUÇÃO", data.evolucao, y);
  }

  drawFooterSignature(doc, data, y + 10);
  return doc.output("arraybuffer");
}
