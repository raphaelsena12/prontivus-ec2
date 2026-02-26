import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
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
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "CONTROLE DE DIABETES", "ANALÍTICO", headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}

// =====================================================
// 10. CONTROLE DE DIABETES
// =====================================================
export function generateControleDiabetesPDF(data: ControleDiabetesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "CONTROLE DE DIABETES", undefined, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
