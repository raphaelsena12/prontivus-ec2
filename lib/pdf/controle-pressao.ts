import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
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
  let y = drawTitle(doc, "CONTROLE DE PRESSÃO ARTERIAL", "ANALÍTICO", headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}

// =====================================================
// 12. CONTROLE DE PRESSÃO ARTERIAL
// =====================================================
export function generateControlePressaoPDF(data: ControlePressaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "CONTROLE DE PRESSÃO ARTERIAL", undefined, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
