import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface GuiaEncaminhamentoData extends BaseDocumentData {
  encaminharPara?: string;
  procedimentosSolicitados?: string;
  resumoHistoriaClinica?: string;
  hipoteseDiagnostica?: string;
  cidCodigo?: string;
  cidDescricao?: string;
  tipoVaga?: string;
}

// =====================================================
// 16. GUIA DE ENCAMINHAMENTO
// =====================================================
export function generateGuiaEncaminhamentoPDF(data: GuiaEncaminhamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "GUIA DE ENCAMINHAMENTO", "REFERÊNCIA E CONTRA-REFERÊNCIA", headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
