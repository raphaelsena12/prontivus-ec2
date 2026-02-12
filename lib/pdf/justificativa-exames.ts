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

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.convenio || "________________________________", MARGIN, y);

  y += 12;

  // =====================================================
  // JUSTIFICATIVA
  // =====================================================
  y = drawSectionLabel(doc, "JUSTIFICATIVA", y);

  const justText = data.justificativa || "";
  const justLines = justText
    ? doc.splitTextToSize(justText, CONTENT_WIDTH)
    : [];

  if (justLines.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.4);
    doc.text(justLines, MARGIN, y);
    y += justLines.length * 4.5 + 8;
  } else {
    y += 8;
  }

  drawFooterSignature(doc, data, y + 10);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
