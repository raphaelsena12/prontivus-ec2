import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawTitle, drawPatientCard,
  drawDualSignature,
  drawRichParagraph, drawSectionLabel, extenso,
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
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO DAS ATIVIDADES", y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação médica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: ". Em razão da condição clínica apresentada, faz-se necessário afastamento das atividades laborais pelo período de " },
    { text: `${Number(dias)} (${extenso(Number(dias))}) dia(s)`, bold: true },
    { text: ", a contar da data de emissão deste documento." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste atestado." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 2. ATESTADO DE AFASTAMENTO SEM CID
// =====================================================
export function generateAtestadoAfastamentoSemCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO DAS ATIVIDADES", y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação médica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: ". Em razão da condição clínica apresentada, faz-se necessário afastamento das atividades laborais pelo período de " },
    { text: `${Number(dias)} (${extenso(Number(dias))}) dia(s)`, bold: true },
    { text: ", a contar da data de emissão deste documento." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 3. ATESTADO DE AFASTAMENTO COM CID
// =====================================================
export function generateAtestadoAfastamentoComCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO DAS ATIVIDADES", y);

  const dias = String(data.diasAfastamento || 1).padStart(2, "0");

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação médica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: ". Em razão da condição clínica apresentada, faz-se necessário afastamento das atividades laborais pelo período de " },
    { text: `${Number(dias)} (${extenso(Number(dias))}) dia(s)`, bold: true },
    { text: ", a contar da data de emissão deste documento." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste atestado." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 12;

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`CID-10: ${data.cidCodigo || ""}`, MARGIN, y);
  y += 8;

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 4. ATESTADO DE AFASTAMENTO COM HISTÓRICO DE CID
// =====================================================
export function generateAtestadoAfastamentoHistoricoCidPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO TEMPORÁRIO DAS ATIVIDADES", y);

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação médica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: ". Apresenta histórico clínico de:" },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 2;

  const cids = data.historicoCids || [];
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  if (cids.length > 0) {
    for (const cid of cids) {
      const linha = `${cid.codigo} — ${cid.descricao}`;
      const linhas = doc.splitTextToSize(linha, CONTENT_WIDTH - 6);
      doc.text(linhas, MARGIN + 4, y);
      y += linhas.length * 5.5;
    }
  }
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste atestado." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}

// =====================================================
// 5. ATESTADO DE AFASTAMENTO POR TEMPO INDETERMINADO
// =====================================================
export function generateAtestadoAfastamentoIndeterminadoPDF(data: AfastamentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = drawPatientCard(doc, data, headerY);
  y = drawTitle(doc, "ATESTADO MÉDICO", "AFASTAMENTO POR PRAZO INDETERMINADO", y);

  y = drawRichParagraph(doc, [
    { text: "Atesto, para os devidos fins, que o(a) paciente acima identificado(a) foi submetido(a) a avaliação médica nesta unidade de saúde em " },
    { text: data.dataConsulta || data.dataEmissao, bold: true },
    { text: ", às " },
    { text: data.horaConsulta || "", bold: true },
    { text: "h, conforme registro em prontuário nº " },
    { text: data.fichaNumero || "", bold: true },
    { text: ". Em razão da condição clínica apresentada, faz-se necessário afastamento das atividades laborais por " },
    { text: "prazo indeterminado", bold: true },
    { text: ", até nova reavaliação médica." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 8;

  y = drawRichParagraph(doc, [
    { text: "Eu, " },
    { text: `${data.pacienteNome.toUpperCase()},`, bold: true },
    { text: " portador(a) do CPF acima identificado, autorizo expressamente o médico responsável a revelar o diagnóstico, inclusive por meio da Classificação Internacional de Doenças (CID), eximindo-o do dever de sigilo profissional para fins deste atestado." },
  ], MARGIN, y, CONTENT_WIDTH, 10, 5.5);
  y += 12;

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`CID-10: ${data.cidCodigo || ""}`, MARGIN, y);

  drawDualSignature(doc, data, y + 10, { hideDateLine: true });
  return doc.output("arraybuffer");
}
