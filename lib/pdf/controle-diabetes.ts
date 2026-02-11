import {
  createDoc, drawTopBar, drawClinicHeader, drawPatientCard,
  drawDualSignature, drawBottomBar,
  COLORS, PAGE_WIDTH, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface ControleDiabetesData {
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

export function generateControleDiabetesPDF(data: ControleDiabetesData): ArrayBuffer {
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
  doc.text("CONTROLE DE DIABETES", MARGIN, y);

  // Aviso importante em vermelho
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.red600);
  doc.text("*IMPORTANTE - manter jejum de 2 horas antes da verificacao", PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 4;

  // =====================================================
  // CARD PACIENTE COMPACTO
  // =====================================================
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

  if (data.analitico) {
    return generateAnalitico(doc, data, y);
  } else {
    return generateSimples(doc, data, y);
  }
}

function generateSimples(doc: any, data: ControleDiabetesData, startY: number): ArrayBuffer {
  let y = startY;

  // Instrução
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("VERIFICAR 1 VEZ AO DIA EM HORARIOS DIFERENTES", MARGIN, y);

  y += 5;

  // Tabela de 30 linhas
  const lineHeight = 6.2;
  const colData = MARGIN;
  const colHora = MARGIN + 50;
  const colMg = MARGIN + 85;

  // Header
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("Data", colData + 10, y);
  doc.text("Hora", colHora, y);
  doc.text("mg/dL", colMg + 20, y);

  y += 4;

  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.2);

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
    doc.text("_____________ mg/dL", colMg, y);

    y += lineHeight;
  }

  y += 3;

  // Verificações madrugada
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("1a Verificacao madrugada  Data____/____/________  horario 02:30  __________mg/dL", MARGIN, y);
  y += 5;
  doc.text("2a Verificacao madrugada  Data____/____/________  horario 02:30  __________mg/dL", MARGIN, y);

  y += 8;

  drawDualSignature(doc, { ...data, pacienteNome: data.pacienteNome }, y);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}

function generateAnalitico(doc: any, data: ControleDiabetesData, startY: number): ArrayBuffer {
  let y = startY;

  // Header colunas
  const colData = MARGIN;
  const colManha = MARGIN + 50;
  const colTarde = MARGIN + 90;
  const colNoite = MARGIN + 130;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("MANHA", colManha, y);
  doc.text("TARDE", colTarde, y);
  doc.text("NOITE", colNoite, y);

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
    doc.text("________ mg/dL", colManha, y);
    doc.text("________ mg/dL", colTarde, y);
    doc.text("________ mg/dL", colNoite, y);

    y += lineHeight;
  }

  y += 3;

  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("1a Verificacao madrugada  Data____/____/________  horario 02:30  __________mg/dL", MARGIN, y);
  y += 5;
  doc.text("2a Verificacao madrugada  Data____/____/________  horario 02:30  __________mg/dL", MARGIN, y);

  y += 8;

  drawDualSignature(doc, { ...data, pacienteNome: data.pacienteNome }, y);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
