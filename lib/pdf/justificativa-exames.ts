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
// 17. JUSTIFICATIVA DE PEDIDOS DE EXAMES PARA PLANOS DE SAÚDE
// =====================================================
export function generateJustificativaPedidosExamesPDF(data: JustificativaExamesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "JUSTIFICATIVA DE SOLICITAÇÃO DE EXAME", undefined, headerY);
  y = drawPatientCard(doc, data, y);

  // ── Quebra de duas linhas antes de Convênio ──
  y += 11;

  // ── Convênio ──
  y = drawRichParagraph(doc, [
    { text: "Convênio: " },
    { text: data.convenio || "______________________________", bold: !!data.convenio },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Quebra de duas linhas ──
  y += 10;

  // ── Justificativa ──
  if (data.justificativa) {
    // Se houver justificativa, mostra "Justificativa: " e o texto na mesma linha inicial
    y = drawRichParagraph(doc, [
      { text: "Justificativa: " },
      { text: data.justificativa },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  } else {
    // Se não houver justificativa, mostra linha tracejada na mesma linha
    y = drawRichParagraph(doc, [
      { text: "Justificativa: " },
      { text: "______________________________" },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  }

  // ── Assinatura apenas do médico (centralizado) ──
  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}
