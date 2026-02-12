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

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTROLE DE PRESSÃO ARTERIAL", PAGE_WIDTH / 2, y, { align: "center" });

  y += 12;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // DADOS DO PACIENTE
  // =====================================================
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PACIENTE", MARGIN, y);

  y += 6;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN, y);

  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Data de Nascimento: ${data.pacienteDataNascimento}`, MARGIN, y);

  y += 10;

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // Instrução
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("VERIFICAR A PRESSÃO 1 VEZ AO DIA EM HORÁRIOS DIFERENTES", PAGE_WIDTH / 2, y, { align: "center" });

  y += 10;

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

  // Header da tabela
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, "F");
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("#", colData + 3, y + 5.5);
  doc.text("Data", colData + 12, y + 5.5);
  doc.text("Hora", colHora, y + 5.5);
  doc.text("P.A", colPA + 10, y + 5.5);

  y += 10;

  const lineHeight = 6.5;

  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, "0");
    
    // Linha alternada sutil (sem fundo, apenas linha)
    if (i % 2 === 0) {
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    }

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${num}`, colData + 3, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Data ____/____/________", colData + 10, y);
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

  // Header da tabela
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("#", colData + 3, y + 5.5);
  doc.text("Data", colData + 12, y + 5.5);
  doc.text("MANHÃ", colManha + 5, y + 5.5);
  doc.text("TARDE", colTarde + 5, y + 5.5);
  doc.text("NOITE", colNoite + 5, y + 5.5);

  y += 10;

  const lineHeight = 6.5;

  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, "0");
    
    // Linha alternada sutil (sem fundo, apenas linha)
    if (i % 2 === 0) {
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    }

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`${num}`, colData + 3, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Data ____/____/____", colData + 10, y);
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
