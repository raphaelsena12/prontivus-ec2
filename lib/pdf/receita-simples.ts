import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface ReceitaSimplesData extends BaseDocumentData {
  medicoCpf?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;
  medicamentos: Array<{
    nome: string;
    dosagem?: string;
    posologia: string;
  }>;
}

// =====================================================
// 18. RECEITA SIMPLES
// =====================================================
export function generateReceitaSimplesPDF(data: ReceitaSimplesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "RECEITA MÉDICA", undefined, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
