import {
  createDoc, drawTopBar, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar, drawSectionLabel,
  COLORS, CONTENT_WIDTH, MARGIN,
} from "./pdf-base";

interface JustificativaExamesData {
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

  convenio?: string;
  justificativa?: string;
}

export function generateJustificativaExamesPDF(data: JustificativaExamesData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  let y = drawTitle(doc, "JUSTIFICATIVA DE SOLICITACAO", "Solicitacao de exame para plano de saude");

  y = drawPatientCard(doc, data, y);

  // =====================================================
  // CONVÊNIO
  // =====================================================
  y = drawSectionLabel(doc, "CONVENIO", y);

  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.convenio || "________________________________", MARGIN + 5, y + 9);

  y += 22;

  // =====================================================
  // JUSTIFICATIVA
  // =====================================================
  y = drawSectionLabel(doc, "JUSTIFICATIVA", y);

  doc.setFillColor(...COLORS.slate50);

  const justText = data.justificativa || "";
  const justLines = justText
    ? doc.splitTextToSize(justText, CONTENT_WIDTH - 14)
    : [];
  const justHeight = Math.max(justLines.length * 4.5 + 8, 60);

  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, justHeight, 2, 2, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, justHeight, 2, 2, "S");

  doc.setFillColor(...COLORS.blue600);
  doc.roundedRect(MARGIN, y, 2, justHeight, 1, 1, "F");

  if (justLines.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(justLines, MARGIN + 7, y + 6);
  }

  y += justHeight + 10;

  drawFooterSignature(doc, data, y + 10);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
