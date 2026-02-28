import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawDualSignature,
  drawRichParagraph,
  MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

// =====================================================
// INTERFACE COMPARTILHADA
// =====================================================
interface DeclaracaoData extends BaseDocumentData {
  horaInicio?: string;
  horaFim?: string;
  nomeAcompanhante?: string;
  cidCodigo?: string;
  cidDescricao?: string;
  dataConsulta?: string;
  horaConsulta?: string;
  fichaNumero?: string;
}

// =====================================================
// 13. DECLARAÇÃO DE COMPARECIMENTO ACOMPANHANTE
// =====================================================
export function generateDeclaracaoComparecimentoAcompanhantePDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", "AFASTAMENTO TEMPORÁRIO DE ACOMPANHANTE", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo principal (data, hora início, hora fim e ficha em negrito) ──
  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "";
  const horaFim = data.horaFim || "";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade médica, como consta registro armazenado na ficha de atendimento nº " },
    { text: fichaNumero, bold: true },
    { text: " no dia " },
    { text: dataConsulta, bold: true },
    { text: " às " },
    { text: horaInicio, bold: true },
    { text: horaFim ? " até " : "" },
    { text: horaFim, bold: horaFim ? true : false },
    { text: ". Acompanhado(a) do Sr(a) " },
    { text: data.nomeAcompanhante || "______________________________", bold: !!data.nomeAcompanhante },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: ", autorizo o médico a declarar nominalmente, ou através do CID, meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── CID ──
  if (data.cidCodigo || data.cidDescricao) {
    y = drawRichParagraph(doc, [
      { text: "CID " },
      { text: data.cidCodigo || "Z00.", bold: true },
      { text: data.cidDescricao ? ` — ${data.cidDescricao}` : "" },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  } else {
    // Se não houver CID, mostra apenas "CID Z00."
    y = drawRichParagraph(doc, [
      { text: "CID " },
      { text: "Z00.", bold: true },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  }

  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 14. DECLARAÇÃO DE COMPARECIMENTO DE HORÁRIO COM CID
// =====================================================
export function generateDeclaracaoComparecimentoHorarioCidPDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", "AFASTAMENTO TEMPORÁRIO", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo principal (data, hora início, hora fim e ficha em negrito) ──
  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "____";
  const horaFim = data.horaFim || "_____";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade médica, como consta registro armazenado na ficha de atendimento nº " },
    { text: fichaNumero, bold: true },
    { text: " no dia " },
    { text: dataConsulta, bold: true },
    { text: " às " },
    { text: horaInicio, bold: true },
    { text: " até " },
    { text: horaFim, bold: true },
    { text: ". Acompanhado(a) do Sr(a) " },
    { text: data.nomeAcompanhante || "______________________________", bold: !!data.nomeAcompanhante },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: ", autorizo o médico a declarar nominalmente, ou através do CID, meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── CID ──
  if (data.cidCodigo || data.cidDescricao) {
    y = drawRichParagraph(doc, [
      { text: "CID " },
      { text: data.cidCodigo || "Z00.", bold: true },
      { text: data.cidDescricao ? ` — ${data.cidDescricao}` : "" },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  } else {
    // Se não houver CID, mostra apenas "CID Z00."
    y = drawRichParagraph(doc, [
      { text: "CID " },
      { text: "Z00.", bold: true },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  }

  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 15. DECLARAÇÃO DE COMPARECIMENTO
// =====================================================
export function generateDeclaracaoComparecimentoPDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", "AFASTAMENTO TEMPORÁRIO", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo principal (data, hora início, hora fim e ficha em negrito) ──
  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "____";
  const horaFim = data.horaFim || "_____";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade médica, como consta registro armazenado na ficha de atendimento nº " },
    { text: fichaNumero, bold: true },
    { text: " no dia " },
    { text: dataConsulta, bold: true },
    { text: " às " },
    { text: horaInicio, bold: true },
    { text: " até " },
    { text: horaFim, bold: true },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Assinaturas do paciente e médico ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}
