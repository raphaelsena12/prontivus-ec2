import {
  createDoc, drawTopBar, drawClinicHeader,
  drawDualSignature, drawBottomBar,
  COLORS, PAGE_WIDTH, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface ControlePressaoData {
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

  analitico: boolean;
}

export function generateControlePressaoPDF(data: ControlePressaoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  // =====================================================
  // TÍTULO
  // =====================================================
  let y = 40;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE PRESSAO ARTERIAL", MARGIN, y);

  y += 4;

  // Card paciente compacto
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 16, 2, 2, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 16, 2, 2, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN + 4, y + 7);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Data Nasc.: ${data.pacienteDataNascimento}`, MARGIN + 4, y + 12);

  y += 20;

  // Instrução
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("VERIFICAR A PRESSAO 1 VEZ AO DIA EM HORARIOS DIFERENTES", MARGIN, y);

  y += 5;

  if (data.analitico) {
    return generateAnalitico(doc, data, y);
  } else {
    return generateSimples(doc, data, y);
  }
}

function generateSimples(doc: any, data: ControlePressaoData, startY: number): ArrayBuffer {
  let y = startY;

  const colData = MARGIN;
  const colHora = MARGIN + 50;
  const colPA = MARGIN + 85;

  // Header
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("Data", colData + 10, y);
  doc.text("Hora", colHora, y);
  doc.text("P.A", colPA + 10, y);

  y += 4;

  const lineHeight = 6.2;

  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, "0");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${num}`, colData, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Data ____/____/________", colData + 8, y);
    doc.text("Hora ____:____", colHora, y);
    doc.text("P.A _______x_______", colPA, y);

    y += lineHeight;
  }

  y += 8;

  drawDualSignature(doc, { ...data, pacienteNome: data.pacienteNome }, y);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}

function generateAnalitico(doc: any, data: ControlePressaoData, startY: number): ArrayBuffer {
  let y = startY;

  const colData = MARGIN;
  const colManha = MARGIN + 45;
  const colTarde = MARGIN + 85;
  const colNoite = MARGIN + 125;

  // Header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("MANHA", colManha + 5, y);
  doc.text("TARDE", colTarde + 5, y);
  doc.text("NOITE", colNoite + 5, y);

  y += 5;

  const lineHeight = 6.2;

  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, "0");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${num}`, colData, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Data ____/____/____", colData + 8, y);
    doc.text("P.A ____x____", colManha, y);
    doc.text("P.A ____x____", colTarde, y);
    doc.text("P.A ____x____", colNoite, y);

    y += lineHeight;
  }

  y += 8;

  drawDualSignature(doc, { ...data, pacienteNome: data.pacienteNome }, y);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
