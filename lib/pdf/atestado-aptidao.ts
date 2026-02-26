import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar, drawRichParagraph,
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
  let y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO FÍSICA E MENTAL", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo 1 (data e hora em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro armazenado na ficha de atendimento nº" },
    { text: data.fichaNumero || "" },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Parágrafo 2 ──
  y = drawRichParagraph(doc, [
    { text: "Em decorrência dos resultados apresentados, atesto que, o mesmo está apto a retornar as suas atividades laborais, visto que, não apresenta nenhuma patologia aparente." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}

// =====================================================
// 7. ATESTADO DE APTIDÃO FÍSICA PARA FREQUENTAR PISCINAS
// =====================================================
export function generateAtestadoAptidaoFisicaPiscinasPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO PARA FREQUENTAR PISCINAS", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo 1 (data e hora em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro armazenado na ficha de atendimento nº " },
    { text: data.fichaNumero || "" },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Parágrafo 2 ──
  y = drawRichParagraph(doc, [
    { text: "Em decorrência dos resultados apresentados, atesto que, o mesmo está apto pelo exame dermatológico a frequentar piscinas." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Sem mais ──
  y = drawRichParagraph(doc, [
    { text: "Sem mais." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Validade ──
  const validade = data.mesesValidade ? String(data.mesesValidade) : "___";
  y = drawRichParagraph(doc, [
    { text: `Atestado médico válido por ${validade} mês/meses.` },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}

// =====================================================
// 8. ATESTADO DE APTIDÃO FÍSICA
// =====================================================
export function generateAtestadoAptidaoFisicaPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", "APTIDÃO FÍSICA", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo 1 (data e hora em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro armazenado na ficha de atendimento nº " },
    { text: data.fichaNumero || "" },
    { text: "." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Parágrafo 2 ──
  y = drawRichParagraph(doc, [
    { text: "Em decorrência dos resultados apresentados, atesto que, o mesmo está apto pelo exame dermatológico a frequentar piscinas." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Sem mais ──
  y = drawRichParagraph(doc, [
    { text: "Sem mais." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Validade ──
  const validade = data.mesesValidade ? String(data.mesesValidade) : "___";
  y = drawRichParagraph(doc, [
    { text: `Atestado médico válido por ${validade} mês/meses.` },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawFooterSignature(doc, data, y + 20, { hideDateLine: true });
  drawBottomBar(doc);
  return doc.output("arraybuffer");
}
