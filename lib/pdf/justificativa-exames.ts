import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature,
  drawRichParagraph,
  MARGIN, CONTENT_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface JustificativaExamesData extends BaseDocumentData {
  convenio?: string;
  justificativa?: string;
  examesSolicitados?: string;
}

// =====================================================
// 17. JUSTIFICATIVA DE SOLICITAÇÃO DE EXAMES
// =====================================================
export function generateJustificativaPedidosExamesPDF(data: JustificativaExamesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "JUSTIFICATIVA DE SOLICITAÇÃO DE EXAMES", "PARA OPERADORA DE PLANO DE SAÚDE", y);

  y += 4;

  y = drawRichParagraph(doc, [
    { text: "Operadora / Convênio: ", bold: true },
    { text: data.convenio || "______________________________" },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 10;

  y = drawRichParagraph(doc, [
    { text: "Exames Solicitados: ", bold: true },
    { text: data.examesSolicitados || "______________________________" },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 10;

  y = drawRichParagraph(doc, [
    { text: "Justificativa Clínica: ", bold: true },
    { text: data.justificativa || "______________________________" },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}
