import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature,
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
  y = drawTitle(doc, "PEDIDO EXAMES", undefined, y);

  // ── Texto do pedido ──
  y += 5;
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.setLineHeightFactor(1.6);

  const lines = doc.splitTextToSize(data.textoPedido, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  y += lines.length * 6.5 + 10;

  // ── Assinatura ──
  drawFooterSignature(doc, data, y);

  return doc.output("arraybuffer");
}
