import {
  createDoc, drawTopBar, drawBottomBar, drawClinicHeader,
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
  drawClinicHeader(doc, data);

  let y = 40;

  // =====================================================
  // TÍTULO
  // =====================================================
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RECEITUÁRIO DE CONTROLE ESPECIAL", PAGE_WIDTH / 2, y, { align: "center" });

  y += 12;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // DUAS COLUNAS: EMITENTE | DATAS
  // =====================================================
  const colLeft = MARGIN;
  const colRight = PAGE_WIDTH / 2 + 5;

  // Coluna esquerda - Identificação do Emitente
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("IDENTIFICAÇÃO DO EMITENTE", colLeft, y);

  y += 6;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, colLeft, y);

  y += 6;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(data.medicoEspecialidade, colLeft, y);

  y += 5;

  doc.text(`CRM: ${data.medicoCrm}`, colLeft, y);

  y += 5;

  if (data.clinicaEndereco) {
    const addrLines = doc.splitTextToSize(data.clinicaEndereco, CONTENT_WIDTH / 2 - 5);
    doc.text(addrLines, colLeft, y);
    y += addrLines.length * 4;
  }

  if (data.clinicaTelefone) {
    doc.text(`Telefone: ${data.clinicaTelefone}`, colLeft, y);
    y += 5;
  }

  if (data.cidade) {
    doc.text(`Cidade: ${data.cidade}`, colLeft, y);
    if (data.uf) {
      doc.text(`UF: ${data.uf}`, colLeft + 40, y);
    }
    y += 5;
  }

  // Coluna direita - Datas e Vias
  let rightY = 40 + 12 + 10; // Mesmo Y inicial da coluna esquerda
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("DATAS E VIAS", colRight, rightY);

  rightY += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data de Emissão:", colRight, rightY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataEmissao, colRight, rightY + 5);

  rightY += 10;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data de Validade:", colRight, rightY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataValidade || "30 dias", colRight, rightY + 5);

  rightY += 10;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("1ª VIA - FARMÁCIA", colRight, rightY);
  doc.text("2ª VIA - PACIENTE", colRight, rightY + 6);

  y = Math.max(y, rightY + 10) + 8;

  // Linha separadora
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
  
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN, y);
  y += 6;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CPF: ${formatCPF(data.pacienteCpf)}`, MARGIN, y);

  const sexoText = data.pacienteSexo || "N/I";
  const idadeText = data.pacienteIdade ? `${data.pacienteIdade} anos` : "N/I";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Sexo: ${sexoText}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  doc.text(`Idade: ${idadeText}`, PAGE_WIDTH - MARGIN, y + 5, { align: "right" });

  y += 6;

  if (data.pacienteEndereco) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    const pAddr = doc.splitTextToSize(data.pacienteEndereco, CONTENT_WIDTH);
    doc.text(pAddr, MARGIN, y);
    y += pAddr.length * 4 + 2;
  }

  y += 8;

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // =====================================================
  // MEDICAMENTOS
  // =====================================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PRESCRIÇÃO", MARGIN, y);
  y += 6;
  
  if (data.medicamentos.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum medicamento prescrito", MARGIN, y);
    y += 10;
  } else {
    data.medicamentos.forEach((med, index) => {
      const num = String(index + 1);

      // Número do medicamento
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(`${num}.`, MARGIN, y);

      // Nome do medicamento
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(med.nome, MARGIN + 8, y);

      // Quantidade à direita
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(`Qtd: ${med.quantidade}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

      y += 6;

      // Posologia
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      const posLines = doc.splitTextToSize(med.posologia, CONTENT_WIDTH - 8);
      doc.text(posLines, MARGIN + 8, y);
      y += posLines.length * 4.5 + 6;
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
