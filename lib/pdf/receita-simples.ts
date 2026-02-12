import {
  createDoc, drawTopBar, drawBottomBar, drawClinicHeader,
  formatCPF, COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface ReceitaSimplesData {
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
  cidade?: string;

  medicamentos: Array<{
    nome: string;
    quantidade: number;
    posologia: string;
  }>;
}

export function generateReceitaSimplesPDF(data: ReceitaSimplesData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  // =====================================================
  // TÍTULO "Receita Simples" - SIMPLES E LIMPO
  // =====================================================
  let y = 40;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RECEITA SIMPLES", PAGE_WIDTH / 2, y, { align: "center" });

  y += 12;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // DADOS DO MÉDICO - SEM BOX, APENAS TEXTO ORGANIZADO
  // =====================================================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, MARGIN, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM: ${data.medicoCrm}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate600);
  doc.text(data.medicoEspecialidade, MARGIN, y);

  if (data.medicoCpf) {
    doc.text(`CPF: ${formatCPF(data.medicoCpf)}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  }

  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Data de Emissão: ${data.dataEmissao}`, MARGIN, y);

  y += 10;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // DADOS DO PACIENTE - SEM BOX, APENAS TEXTO ORGANIZADO
  // =====================================================
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN, y);

  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CPF: ${formatCPF(data.pacienteCpf)}`, MARGIN, y);

  const sexoText = data.pacienteSexo || "N/I";
  const idadeText = data.pacienteIdade ? `${data.pacienteIdade} anos` : "N/I";
  doc.text(`Sexo: ${sexoText} | Idade: ${idadeText}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 5;

  if (data.pacienteEndereco) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slate600);
    const pAddrLines = doc.splitTextToSize(data.pacienteEndereco, CONTENT_WIDTH);
    doc.text(pAddrLines, MARGIN, y);
    y += pAddrLines.length * 4 + 2;
  }

  y += 8;

  // Linha separadora mais forte antes da prescrição
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;

  // =====================================================
  // MEDICAMENTOS - LISTA LIMPA SEM BOXES
  // =====================================================
  if (data.medicamentos.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum medicamento prescrito", MARGIN, y);
    y += 10;
  } else {
    data.medicamentos.forEach((med, index) => {
      const num = String(index + 1);
      const qtd = String(med.quantidade);

      // Número simples
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(`${num}.`, MARGIN, y);

      // Nome do medicamento em negrito
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(med.nome, MARGIN + 8, y);

      // Quantidade à direita
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(`Qtd: ${qtd}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

      y += 6;

      // Posologia
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      const posLines = doc.splitTextToSize(med.posologia, CONTENT_WIDTH - 8);
      doc.text(posLines, MARGIN + 8, y);
      y += posLines.length * 4.5 + 4;
    });
  }

  // =====================================================
  // ASSINATURA
  // =====================================================
  const footerY = Math.max(y + 30, PAGE_HEIGHT - 50);

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 - 40, footerY, PAGE_WIDTH / 2 + 40, footerY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, PAGE_WIDTH / 2, footerY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${data.medicoCrm} — ${data.medicoEspecialidade}`, PAGE_WIDTH / 2, footerY + 10, { align: "center" });

  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
