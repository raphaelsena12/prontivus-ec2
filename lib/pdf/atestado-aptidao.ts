import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawRichParagraph,
  MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

// =====================================================
// INTERFACE COMPARTILHADA
// =====================================================
interface AptidaoData extends BaseDocumentData {
  mesesValidade?: number;
  observacoes?: string;
  dataConsulta?: string;
  horaConsulta?: string;
  fichaNumero?: string;
}

// =====================================================
// 6. ATESTADO DE APTIDÃO FÍSICA E MENTAL
// =====================================================
export function generateAtestadoAptidaoFisicaMentalPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO FÍSICA E MENTAL", y);

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação clínica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Ao exame clínico, o(a) paciente não apresenta alterações físicas ou mentais que contraindiquem o retorno às suas atividades laborais, encontrando-se em condições de plena aptidão física e mental para o exercício de suas funções." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 7. ATESTADO DE APTIDÃO FÍSICA PARA FREQUENTAR PISCINAS
// =====================================================
export function generateAtestadoAptidaoFisicaPiscinasPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO FÍSICA — FREQUÊNCIA A PISCINAS", y);

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação clínica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Ao exame dermatológico, o(a) paciente não apresenta lesões cutâneas, infecções fúngicas, bacterianas ou parasitárias que contraindiquem a frequência a piscinas e demais instalações aquáticas, encontrando-se apto(a) para tal atividade." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  const validade = data.mesesValidade ? String(data.mesesValidade) : "___";
  y = drawRichParagraph(doc, [
    { text: `Este atestado possui validade de ${validade} mês(es) a partir da data de sua emissão.` },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 8. ATESTADO DE APTIDÃO FÍSICA
// =====================================================
export function generateAtestadoAptidaoFisicaPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO FÍSICA PARA ATIVIDADE LABORATIVA", y);

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação clínica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Ao exame clínico, o(a) paciente não apresenta alterações que contraindiquem a prática de atividades físicas, encontrando-se em condições de plena aptidão física para o exercício de suas funções." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  const validade = data.mesesValidade ? String(data.mesesValidade) : "___";
  y = drawRichParagraph(doc, [
    { text: `Este atestado possui validade de ${validade} mês(es) a partir da data de sua emissão.` },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  return doc.output("arraybuffer");
}
