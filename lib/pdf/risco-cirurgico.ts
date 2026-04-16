import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, checkPageBreak,
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
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "RISCO CIRÚRGICO CARDÍACO", undefined, y);

  // Função auxiliar para desenhar um campo com label e valor
  const drawField = (label: string, value?: string): void => {
    y = checkPageBreak(doc, y, 12);
    y = drawRichParagraph(doc, [
      { text: `${label}: `, bold: true },
      { text: value || "______________________________", bold: true },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 3; // Espaçamento reduzido entre tópicos
  };

  // Função auxiliar para desenhar um campo sem dois pontos (apenas label)
  const drawFieldNoColon = (label: string, value?: string): void => {
    y = checkPageBreak(doc, y, 14);
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
  drawField("CLASSIFICAÇÃO DO RISCO CIRÚRGICO CARDÍACO", data.riscoCirurgicoCardiaco);
  drawField("ÍNDICE DE GOLDMAN", data.goldman);
  drawField("CLASSIFICAÇÃO ASA (Anesthesiologists)", data.asa);
  drawField("ELETROCARDIOGRAMA (ECG)", data.ecg);
  drawField("ALERGIAS E REAÇÕES ADVERSAS", data.alergias);
  drawField("CIRURGIAS ANTERIORES", data.cirurgiasAnteriores);
  drawField("INTERCORRÊNCIAS ANESTÉSICO-CIRÚRGICAS", data.intercorrencias);
  drawField("MEDICAÇÕES EM USO CONTÍNUO", data.medicacoesEmUso);
  drawField("ANTECEDENTES PESSOAIS E FAMILIARES", data.antecedentesPessoais);

  drawFieldNoColon("ECOCARDIOGRAMA", data.ecocardiograma);
  drawFieldNoColon("TESTE ERGOMÉTRICO", data.ergometria);
  drawFieldNoColon("RADIOGRAFIA DE TÓRAX (PA e Perfil)", data.rxTorax);
  drawField("OBSERVAÇÕES", data.observacoes);

  // ── Assinatura apenas do médico (centralizado) ──
  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}
