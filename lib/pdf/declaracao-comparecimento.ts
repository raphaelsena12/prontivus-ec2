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
// 13. DECLARAÇÃO DE COMPARECIMENTO — ACOMPANHANTE
// =====================================================
export function generateDeclaracaoComparecimentoAcompanhantePDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", "AFASTAMENTO TEMPORÁRIO DE ACOMPANHANTE", y);

  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "";
  const horaFim = data.horaFim || "";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos, para os devidos fins, que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde para atendimento médico, conforme registro em prontuário nº " },
    { text: fichaNumero, bold: true },
    { text: ", no dia " },
    { text: dataConsulta, bold: true },
    { text: ", das " },
    { text: horaInicio, bold: true },
    ...(horaFim ? [{ text: "h às " }, { text: horaFim, bold: true as const }] : []),
    { text: "h, acompanhado(a) por " },
    { text: data.nomeAcompanhante || "______________________________", bold: !!data.nomeAcompanhante },
    { text: ", cujo afastamento temporário das atividades laborais se fez necessário para prestar assistência ao(à) paciente." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste documento." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  if (data.cidCodigo || data.cidDescricao) {
    y = drawRichParagraph(doc, [
      { text: "CID-10: " },
      { text: data.cidCodigo || "", bold: true },
      { text: data.cidDescricao ? ` — ${data.cidDescricao}` : "" },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  }

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 14. DECLARAÇÃO DE COMPARECIMENTO COM HORÁRIO E CID
// =====================================================
export function generateDeclaracaoComparecimentoHorarioCidPDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", "COM REGISTRO DE HORÁRIO E CID", y);

  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "____";
  const horaFim = data.horaFim || "_____";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos, para os devidos fins, que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde para atendimento médico, conforme registro em prontuário nº " },
    { text: fichaNumero, bold: true },
    { text: ", no dia " },
    { text: dataConsulta, bold: true },
    { text: ", das " },
    { text: horaInicio, bold: true },
    { text: "h às " },
    { text: horaFim, bold: true },
    { text: "h." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste documento." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  if (data.cidCodigo || data.cidDescricao) {
    y = drawRichParagraph(doc, [
      { text: "CID-10: " },
      { text: data.cidCodigo || "", bold: true },
      { text: data.cidDescricao ? ` — ${data.cidDescricao}` : "" },
    ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
    y += 8;
  }

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 15. DECLARAÇÃO DE COMPARECIMENTO
// =====================================================
export function generateDeclaracaoComparecimentoPDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "DECLARAÇÃO DE COMPARECIMENTO", undefined, y);

  const dataConsulta = data.dataConsulta || data.dataEmissao;
  const horaInicio = data.horaInicio || data.horaConsulta || "____";
  const horaFim = data.horaFim || "_____";
  const fichaNumero = data.fichaNumero || "";

  y = drawRichParagraph(doc, [
    { text: "Declaramos, para os devidos fins, que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde para atendimento médico, conforme registro em prontuário nº " },
    { text: fichaNumero, bold: true },
    { text: ", no dia " },
    { text: dataConsulta, bold: true },
    { text: ", das " },
    { text: horaInicio, bold: true },
    { text: "h às " },
    { text: horaFim, bold: true },
    { text: "h." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}
