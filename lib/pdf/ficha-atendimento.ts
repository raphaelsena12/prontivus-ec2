import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface FichaAtendimentoData extends BaseDocumentData {
  dataConsulta: string;
  anamnese?: string;
  cidCodes?: Array<{ code: string; description: string }>;
  exames?: Array<{ nome: string; tipo: string }>;
  prescricoes?: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

// =====================================================
// FICHA DE ATENDIMENTO
// =====================================================
export function generateFichaAtendimentoPDF(data: FichaAtendimentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "FICHA DE ATENDIMENTO", `Consulta: ${data.dataConsulta}`, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
