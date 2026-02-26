import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
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
  evolucao?: string;
}

// =====================================================
// PRONTUÁRIO MÉDICO
// =====================================================
export function generateProntuarioPDF(data: ProntuarioData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "PRONTUÁRIO MÉDICO", `Consulta: ${data.dataConsulta}`, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
