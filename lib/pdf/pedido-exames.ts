import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawJustifiedText, checkPageBreak,
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

  // ── Texto do pedido ──
  y += 5;
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);

  const lines = doc.splitTextToSize(data.textoPedido, CONTENT_WIDTH);
  y = drawJustifiedText(doc, lines, MARGIN, y, CONTENT_WIDTH, 11, 6.5);
  y += 10;

  // ── Assinatura ──
  drawFooterSignature(doc, data, y, { hideSeparatorLine: true, hideDateLine: true });

  return doc.output("arraybuffer");
}
