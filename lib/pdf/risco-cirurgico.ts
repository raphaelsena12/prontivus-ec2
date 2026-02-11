import {
  createDoc, drawTopBar, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar, drawSectionLabel, drawFieldRow,
  COLORS, CONTENT_WIDTH, MARGIN,
} from "./pdf-base";

interface RiscoCirurgicoData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;

  dataEmissao: string;
  cidade?: string;

  goldman?: string;
  asa?: string;
  ecg?: string;
  alergias?: string;
  cirurgiasAnteriores?: string;
  intercorrencias?: string;
  medicacoesEmUso?: string;
  antecedentesPessoais?: string;
  riscoCirurgicoCardiaco?: string;
  ecocardiograma?: string;
  ergometria?: string;
  rxTorax?: string;
  observacoes?: string;
}

export function generateRiscoCirurgicoPDF(data: RiscoCirurgicoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  let y = drawTitle(doc, "RISCO CIRURGICO CARDIACO", "Avaliacao pre-operatoria");

  y = drawPatientCard(doc, data, y);

  // =====================================================
  // CAMPOS DE AVALIAÇÃO
  // =====================================================
  const cardX = MARGIN;
  const cardW = CONTENT_WIDTH;
  const fieldX = cardX + 5;
  const fieldW = cardW - 10;

  // Card principal
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(cardX, y, cardW, 120, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, y, cardW, 120, 3, 3, "S");

  let fieldY = y + 6;

  fieldY = drawFieldRow(doc, "RISCO CIRURGICO CARDIACO", data.riscoCirurgicoCardiaco || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "GOLDMAN", data.goldman || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "ASA", data.asa || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "ECG", data.ecg || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "ALERGIAS", data.alergias || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "CIRURGIAS ANTERIORES", data.cirurgiasAnteriores || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "INTERCORRENCIAS", data.intercorrencias || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "MEDICACOES EM USO", data.medicacoesEmUso || "", fieldX, fieldY, fieldW);
  fieldY = drawFieldRow(doc, "ANTECEDENTES PESSOAIS", data.antecedentesPessoais || "", fieldX, fieldY, fieldW);

  y += 126;

  // =====================================================
  // EXAMES
  // =====================================================
  y = drawSectionLabel(doc, "EXAMES", y);

  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(cardX, y, cardW, 30, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, y, cardW, 30, 3, 3, "S");

  let examY = y + 6;
  examY = drawFieldRow(doc, "ECOCARDIOGRAMA", data.ecocardiograma || "", fieldX, examY, fieldW);
  examY = drawFieldRow(doc, "ERGOMETRIA", data.ergometria || "", fieldX, examY, fieldW);
  drawFieldRow(doc, "RX - TORAX", data.rxTorax || "", fieldX, examY, fieldW);

  y += 36;

  // =====================================================
  // OBSERVAÇÕES
  // =====================================================
  if (data.observacoes && data.observacoes.trim()) {
    y = drawSectionLabel(doc, "OBS", y);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    const obsText = doc.splitTextToSize(data.observacoes, CONTENT_WIDTH - 4);
    doc.text(obsText, MARGIN + 2, y);
    y += obsText.length * 4 + 6;
  }

  drawFooterSignature(doc, data, y + 10);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
