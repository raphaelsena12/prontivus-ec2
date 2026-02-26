import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface ReceitaControleEspecialData extends BaseDocumentData {
  medicoCpf?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;
  dataValidade?: string;
  uf?: string;
  medicamentos: Array<{
    nome: string;
    quantidade: number;
    posologia: string;
  }>;
}

// =====================================================
// 19. RECEITA DE CONTROLE ESPECIAL
// =====================================================
export function generateReceitaControleEspecialPDF(data: ReceitaControleEspecialData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "RECEITUÁRIO DE CONTROLE ESPECIAL", undefined, headerY);
  y = drawPatientCard(doc, data, y);
  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
