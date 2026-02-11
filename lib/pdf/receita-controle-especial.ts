import {
  createDoc, drawTopBar, drawBottomBar,
  formatCPF, COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface ReceitaControleEspecialData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;
  medicoCpf?: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;
  pacienteEndereco?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;

  dataEmissao: string;
  dataValidade?: string;
  cidade?: string;
  uf?: string;

  medicamentos: Array<{
    nome: string;
    quantidade: number;
    posologia: string;
  }>;
}

export function generateReceitaControleEspecialPDF(data: ReceitaControleEspecialData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);

  let y = 10;

  // =====================================================
  // TÍTULO
  // =====================================================
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 1, 1, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("RECEITUARIO DE CONTROLE ESPECIAL", PAGE_WIDTH / 2, y + 7, { align: "center" });

  y += 16;

  // =====================================================
  // DUAS COLUNAS: EMITENTE | DATAS
  // =====================================================
  const boxLeft = MARGIN;
  const boxRight = PAGE_WIDTH / 2 + 5;

  // Box esquerda - Identificação do Emitente
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxLeft, y, CONTENT_WIDTH / 2 - 2, 45, 2, 2, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("IDENTIFICACAO DO EMITENTE", boxLeft + 4, y + 5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, boxLeft + 4, y + 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(data.medicoEspecialidade, boxLeft + 4, y + 17);

  doc.text(`CRM: ${data.medicoCrm}`, boxLeft + 4, y + 23);

  if (data.clinicaEndereco) {
    const addrLines = doc.splitTextToSize(data.clinicaEndereco, CONTENT_WIDTH / 2 - 12);
    doc.text(addrLines, boxLeft + 4, y + 29);
  }

  if (data.clinicaTelefone) {
    doc.text(`Telefone: ${data.clinicaTelefone}`, boxLeft + 4, y + 35);
  }

  if (data.cidade) {
    doc.text(`Cidade: ${data.cidade}`, boxLeft + 4, y + 40);
    if (data.uf) {
      doc.text(`UF: ${data.uf}`, boxLeft + CONTENT_WIDTH / 2 - 20, y + 40);
    }
  }

  // Box direita - Datas e Vias
  doc.roundedRect(boxRight, y, CONTENT_WIDTH / 2 - 2, 45, 2, 2, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data de Emissao:", boxRight + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataEmissao, boxRight + 40, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data de Validade:", boxRight + 4, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataValidade || "30 dias", boxRight + 40, y + 15);

  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("1a VIA FARMACIA", boxRight + 4, y + 20);
  doc.text("2a VIA PACIENTE", boxRight + 4, y + 26);

  y += 51;

  // =====================================================
  // DADOS DO PACIENTE
  // =====================================================
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Paciente:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`${formatCPF(data.pacienteCpf)} - ${data.pacienteNome}`, MARGIN + 18, y);

  const sexoText = data.pacienteSexo || "N/I";
  const idadeText = data.pacienteIdade ? `${data.pacienteIdade}` : "N/I";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Sexo: ${sexoText}`, PAGE_WIDTH - MARGIN - 40, y);
  doc.text(`Idade: ${idadeText}`, PAGE_WIDTH - MARGIN - 14, y);

  y += 5;

  if (data.pacienteEndereco) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Endereco:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const pAddr = doc.splitTextToSize(data.pacienteEndereco, CONTENT_WIDTH - 20);
    doc.text(pAddr, MARGIN + 18, y);
    y += pAddr.length * 3.5 + 2;
  }

  y += 3;

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // MEDICAMENTOS
  // =====================================================
  if (data.medicamentos.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum medicamento prescrito", MARGIN + 5, y);
    y += 10;
  } else {
    data.medicamentos.forEach((med, index) => {
      const num = String(index + 1) + ".";

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate800);
      doc.text(num, MARGIN + 2, y);

      doc.setFont("helvetica", "bold");
      const nomeWidth = doc.getTextWidth(med.nome + " ");
      doc.text(med.nome, MARGIN + 10, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate400);
      const dashStart = MARGIN + 10 + nomeWidth;
      const dashEnd = PAGE_WIDTH - MARGIN - 10;
      const dashWidth = dashEnd - dashStart;
      if (dashWidth > 5) {
        const dashes = "-".repeat(Math.floor(dashWidth / 1.5));
        doc.setFontSize(8);
        doc.text(dashes, dashStart, y);
      }

      doc.setFontSize(10);
      doc.setTextColor(...COLORS.slate800);
      doc.text(String(med.quantidade), PAGE_WIDTH - MARGIN, y, { align: "right" });

      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(med.posologia, MARGIN + 10, y);

      y += 10;
    });
  }

  // =====================================================
  // BOXES INFERIORES: COMPRADOR | FORNECEDOR
  // =====================================================
  const boxY = Math.max(y + 15, PAGE_HEIGHT - 75);

  // Box Comprador
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, boxY, CONTENT_WIDTH / 2 - 3, 42, 2, 2, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("IDENTIFICACAO DO COMPRADOR", MARGIN + 4, boxY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Nome:_________________________________", MARGIN + 4, boxY + 12);
  doc.text("Ident:____________ Org. Emissor:________", MARGIN + 4, boxY + 18);
  doc.text("End:__________________________________", MARGIN + 4, boxY + 24);
  doc.text("Cidade:____________________UF:________", MARGIN + 4, boxY + 30);
  doc.text("Telefone:(_____)_______________________", MARGIN + 4, boxY + 36);

  // Box Fornecedor
  const rightBoxX = PAGE_WIDTH / 2 + 2;
  doc.roundedRect(rightBoxX, boxY, CONTENT_WIDTH / 2 - 3, 42, 2, 2, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("IDENTIFICACAO DO FORNECEDOR", rightBoxX + 4, boxY + 5);

  // Linha assinatura farmacêutico
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(rightBoxX + 8, boxY + 18, rightBoxX + CONTENT_WIDTH / 2 - 12, boxY + 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("ASSINATURA DO FARMACEUTICO", rightBoxX + 10, boxY + 23);

  doc.text("DATA _____/_____/_________", rightBoxX + 10, boxY + 34);

  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
