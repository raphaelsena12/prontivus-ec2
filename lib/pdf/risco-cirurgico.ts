import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar,
  drawRichParagraph,
  MARGIN, CONTENT_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface RiscoCirurgicoData extends BaseDocumentData {
  goldman?: string;
  asa?: string;
  ecg?: string;
  alergias?: string;
  cirurgiasAnteriores?: string;
  intercorrencias?: string;
  medicacoesEmUso?: string;
  antecedentesPessoais?: string;
  riscoCirurgicoCardiaco?: string;
  ecocardiograma?: string;
  ergometria?: string;
  rxTorax?: string;
  observacoes?: string;
}

// =====================================================
// 20. RISCO CIRÚRGICO CARDÍACO
// =====================================================
export function generateRiscoCirurgicoPDF(data: RiscoCirurgicoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "RISCO CIRÚRGICO CARDÍACO", undefined, headerY);
  y = drawPatientCard(doc, data, y);

  // Função auxiliar para desenhar um campo com label e valor
  const drawField = (label: string, value?: string): void => {
    y = drawRichParagraph(doc, [
      { text: `${label}: `, bold: true },
      { text: value || "______________________________", bold: true },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 3; // Espaçamento reduzido entre tópicos
  };

  // Função auxiliar para desenhar um campo sem dois pontos (apenas label)
  const drawFieldNoColon = (label: string, value?: string): void => {
    if (value) {
      y = drawRichParagraph(doc, [
        { text: label, bold: true },
      ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
      y += 2;
      // Texto do valor (pode ter múltiplas linhas) - em negrito
      const valueLines = doc.splitTextToSize(value, CONTENT_WIDTH);
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.setLineHeightFactor(1.4);
      doc.text(valueLines, MARGIN, y);
      y += valueLines.length * 7;
      y += 1; // Espaçamento reduzido após o valor
    } else {
      y = drawRichParagraph(doc, [
        { text: label, bold: true },
      ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
      y += 3; // Espaçamento reduzido
    }
  };

  // ── Campos do formulário ──
  drawField("RISCO CIRÚRGICO CARDÍACO", data.riscoCirurgicoCardiaco);
  drawField("GOLDMAN", data.goldman);
  drawField("ASA", data.asa);
  drawField("ECG", data.ecg);
  drawField("ALERGIAS", data.alergias);
  drawField("CIRURGIAS ANTERIORES", data.cirurgiasAnteriores);
  drawField("INTERCORRÊNCIAS", data.intercorrencias);
  drawField("MEDICAÇÕES EM USO", data.medicacoesEmUso);
  drawField("ANTECEDENTES PESSOAIS", data.antecedentesPessoais);
  
  // Campos sem dois pontos
  drawFieldNoColon("ECOCARDIOGRAMA", data.ecocardiograma);
  drawFieldNoColon("ERGOMETRIA", data.ergometria);
  drawFieldNoColon("RX - TORAX", data.rxTorax);
  drawField("OBS", data.observacoes);

  // ── Assinatura apenas do médico (centralizado) ──
  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  drawBottomBar(doc, data);
  return doc.output("arraybuffer");
}
