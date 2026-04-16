import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawJustifiedText, checkPageBreak,
  MARGIN, CONTENT_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface LaudoMedicoData extends BaseDocumentData {
  textoLaudo: string;
}

// =====================================================
// LAUDO MÉDICO
// =====================================================
export function generateLaudoMedicoPDF(data: LaudoMedicoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "LAUDO MÉDICO", undefined, y);

  // ── Texto do laudo ──
  y += 5;
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);

  const lines = doc.splitTextToSize(data.textoLaudo, CONTENT_WIDTH);
  y = checkPageBreak(doc, y, 6.5);
  y = drawJustifiedText(doc, lines, MARGIN, y, CONTENT_WIDTH, 11, 6.5);
  y += 10;

  // ── Assinatura ──
  drawFooterSignature(doc, data, y);

  return doc.output("arraybuffer");
}
