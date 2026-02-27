import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawFooterSignature, drawBottomBar,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface FichaAtendimentoData extends BaseDocumentData {
  dataConsulta: string;
  horaConsulta?: string;
  anamnese?: string;
  cidCodes?: Array<{ code: string; description: string }>;
  exames?: Array<{ nome: string; tipo: string }>;
  protocolos?: Array<{ nome: string; descricao?: string }>;
  prescricoes?: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

// =====================================================
// FICHA DE ATENDIMENTO
// =====================================================
export function generateFichaAtendimentoPDF(data: FichaAtendimentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("FICHA DE ATENDIMENTO", MARGIN, y);
  y += 10;
  
  // ── Data e Hora da consulta ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  let dataHoraTexto = `Data: ${data.dataConsulta}`;
  if (data.horaConsulta) {
    dataHoraTexto += ` | Hora: ${data.horaConsulta}`;
  }
  doc.text(dataHoraTexto, MARGIN, y);
  y += 8;
  
  // ── Anamnese ──
  if (data.anamnese) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("ANAMNESE", MARGIN, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    const anamneseLines = doc.splitTextToSize(data.anamnese, CONTENT_WIDTH);
    doc.text(anamneseLines, MARGIN, y);
    y += anamneseLines.length * 5 + 6;
  }
  
  // ── CID10 ──
  if (data.cidCodes && data.cidCodes.length > 0) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("CID-10", MARGIN, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    data.cidCodes.forEach((cid) => {
      doc.text(`${cid.code} - ${cid.description}`, MARGIN + 5, y);
      y += 5;
    });
    y += 4;
  }
  
  // ── Exames ──
  if (data.exames && data.exames.length > 0) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("EXAMES", MARGIN, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    data.exames.forEach((exame) => {
      const exameText = exame.tipo ? `${exame.nome} (${exame.tipo})` : exame.nome;
      doc.text(`• ${exameText}`, MARGIN + 5, y);
      y += 5;
    });
    y += 4;
  }
  
  // ── Protocolos ──
  if (data.protocolos && data.protocolos.length > 0) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("PROTOCOLOS", MARGIN, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    data.protocolos.forEach((protocolo) => {
      doc.text(`• ${protocolo.nome}`, MARGIN + 5, y);
      y += 5;
      if (protocolo.descricao) {
        const descLines = doc.splitTextToSize(protocolo.descricao, CONTENT_WIDTH - 10);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.slate600);
        doc.text(descLines, MARGIN + 10, y);
        y += descLines.length * 4;
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.slate800);
      }
    });
    y += 4;
  }
  
  // ── Prescrições ──
  if (data.prescricoes && data.prescricoes.length > 0) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("PRESCRIÇÕES", MARGIN, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    data.prescricoes.forEach((presc, index) => {
      const numPresc = index + 1;
      let prescText = `${numPresc}. ${presc.medicamento}`;
      if (presc.dosagem) {
        prescText += ` ${presc.dosagem}`;
      }
      doc.text(prescText, MARGIN + 5, y);
      y += 5;
      if (presc.posologia) {
        const posologiaText = presc.duracao 
          ? `${presc.posologia} - ${presc.duracao}`
          : presc.posologia;
        doc.text(`   ${posologiaText}`, MARGIN + 10, y);
        y += 5;
      }
    });
    y += 4;
  }
  
  // ── Assinatura do médico (sem traço e sem data, alinhada no bottom) ──
  drawFooterSignature(doc, data, undefined, { hideDateLine: true, hideSignatureLine: true });
  drawBottomBar(doc, data);
  return doc.output("arraybuffer");
}
