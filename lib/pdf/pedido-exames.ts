import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, checkPageBreak,
  MARGIN, CONTENT_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface PedidoExamesData extends BaseDocumentData {
  textoPedido: string;
}

// =====================================================
// PEDIDO DE EXAMES
// =====================================================
export function generatePedidoExamesPDF(data: PedidoExamesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "SOLICITAÇÃO DE EXAMES", undefined, y);

  // ── Lista de exames ──
  y += 5;
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);

  const lineHeight = 6.5;
  const items = data.textoPedido.split("\n").map(l => l.trim()).filter(Boolean);
  for (const item of items) {
    const wrapped = doc.splitTextToSize(item, CONTENT_WIDTH);
    for (const line of wrapped) {
      y = checkPageBreak(doc, y, lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
  }
  y += 10;

  // ── Assinatura ──
  drawFooterSignature(doc, data, y, { hideSeparatorLine: true, hideDateLine: true });

  return doc.output("arraybuffer");
}
