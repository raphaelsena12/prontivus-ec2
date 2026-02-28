import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawDualSignature,
  drawRichParagraph, drawSectionLabel,
  MARGIN, CONTENT_WIDTH, COLORS, PDF_FONT,
} from "./pdf-base";

// =====================================================
// INTERFACE COMPARTILHADA
// =====================================================
interface AfastamentoData extends BaseDocumentData {
  diasAfastamento?: number;
  cidCodigo?: string;
  cidDescricao?: string;
  historicoCids?: Array<{ codigo: string; descricao: string }>;
  observacoes?: string;
  dataConsulta?: string;
  horaConsulta?: string;
  fichaNumero?: string;
}

// =====================================================
// 1. ATESTADO DE AFASTAMENTO
// =====================================================
export function generateAtestadoAfastamentoPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO", headerY);
  y = drawPatientCard(doc, data, y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  // ── Parágrafo principal (data, hora e prontuário em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro, armazenado no Prontuário Nº " },
    { text: data.fichaNumero || "" },
    { text: ". Em decorrência dos resultados apresentados, o mesmo deverá ficar em repouso e afastado de suas atividades laborais por um período de " },
    { text: dias },
    { text: " Dias." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: " autorizo o médico a declarar nominalmente, ou através do CID, meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  // ── Rodapé duplo sem traço/data ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 2. ATESTADO DE AFASTAMENTO SEM CID
// =====================================================
export function generateAtestadoAfastamentoSemCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", undefined, headerY);
  y = drawPatientCard(doc, data, y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  // ── Parágrafo principal (data, hora e prontuário em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro, armazenado no Prontuário Nº " },
    { text: data.fichaNumero || "" },
    { text: ". Em decorrência dos resultados apresentados, o mesmo deverá ficar em repouso e afastado de suas atividades laborais por um período de " },
    { text: dias },
    { text: " Dias." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  // ── Rodapé duplo sem traço/data ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 3. ATESTADO DE AFASTAMENTO COM CID
// =====================================================
export function generateAtestadoAfastamentoComCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO", headerY);
  y = drawPatientCard(doc, data, y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  // ── Parágrafo principal (data, hora e prontuário em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro, armazenado no Prontuário Nº " },
    { text: data.fichaNumero || "" },
    { text: ". Em decorrência dos resultados apresentados, o mesmo deverá ficar em repouso e afastado de suas atividades laborais por um período de " },
    { text: dias },
    { text: " Dias." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: " autorizo o médico a declarar nominalmente, ou através do CID, meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 12;

  // ── CID (mesmo estilo do corpo) ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`CID: ${data.cidCodigo || ""}`, MARGIN, y);
  y += 8;

  // ── Rodapé duplo sem traço/data ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 4. ATESTADO DE AFASTAMENTO COM HISTÓRICO DE CID
// =====================================================
export function generateAtestadoAfastamentoHistoricoCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", undefined, headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo principal (data e hora em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro, armazenado no Prontuário Nº " },
    { text: data.fichaNumero || "" },
    { text: ". Com histórico de:" },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 2;

  // ── Lista de CIDs históricos ──
  const cids = data.historicoCids || [];
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  if (cids.length > 0) {
    for (const cid of cids) {
      const linha = `${cid.codigo} - ${cid.descricao}`;
      const linhas = doc.splitTextToSize(linha, CONTENT_WIDTH - 6);
      doc.text(linhas, MARGIN + 4, y);
      y += linhas.length * 5.5;
    }
  }
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: ", autorizo o médico a declarar nominalmente ou através do CID meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  // ── Rodapé duplo sem traço/data ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 5. ATESTADO DE AFASTAMENTO POR TEMPO INDETERMINADO
// =====================================================
export function generateAtestadoAfastamentoIndeterminadoPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO POR TEMPO INDETERMINADO", headerY);
  y = drawPatientCard(doc, data, y);

  // ── Parágrafo principal (data, hora e prontuário em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "O paciente acima identificado, foi submetido a consulta médica nesta unidade na data " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: ", como consta registro, armazenado no Prontuário Nº " },
    { text: data.fichaNumero || "" },
    { text: ". Em decorrência dos resultados apresentados, o mesmo deverá ficar em repouso e afastado de suas atividades laborais por tempo indeterminado." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  // ── Autorização (nome do paciente em negrito) ──
  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: data.pacienteNome.toUpperCase(), bold: true },
    { text: " autorizo o médico a declarar nominalmente, ou através do CID, meu diagnóstico, liberando-o da guarda do sigilo profissional." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 12;

  // ── CID ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`CID: ${data.cidCodigo || ""}`, MARGIN, y);

  // ── Rodapé duplo sem traço/data ──
  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}
