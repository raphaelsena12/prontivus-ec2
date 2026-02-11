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

  // =====================================================
  // TÍTULO "Receita Simples" em fundo slate
  // =====================================================
  let y = 10;

  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 1, 1, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Receita Simples", PAGE_WIDTH / 2, y + 7, { align: "center" });

  y += 16;

  // =====================================================
  // DADOS DA CLÍNICA E MÉDICO
  // =====================================================
  const colLeft = MARGIN;
  const colRight = PAGE_WIDTH / 2 + 10;

  // Clínica
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.clinicaNome, colLeft, y);

  // Data emissão (direita)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Data de emissao: ${data.dataEmissao}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 5;

  if (data.clinicaEndereco) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);

    doc.setFont("helvetica", "bold");
    doc.text("Endereco:", colLeft, y);
    doc.setFont("helvetica", "normal");
    const addrLines = doc.splitTextToSize(data.clinicaEndereco, 90);
    doc.text(addrLines, colLeft + 20, y);
    y += addrLines.length * 3.5 + 1;
  }

  if (data.clinicaTelefone) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Telefone:", colLeft, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.clinicaTelefone, colLeft + 20, y);
    y += 5;
  }

  y += 2;

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 5;

  // Médico
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, colLeft, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM: ${data.medicoCrm}`, PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate600);
  doc.text(data.medicoEspecialidade, colLeft, y);

  if (data.medicoCpf) {
    doc.text(`CPF: ${formatCPF(data.medicoCpf)}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  }

  y += 6;

  // =====================================================
  // LINHA SEPARADORA GROSSA
  // =====================================================
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 5;

  // =====================================================
  // DADOS DO PACIENTE
  // =====================================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Paciente:", colLeft, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`${formatCPF(data.pacienteCpf)} - ${data.pacienteNome}`, colLeft + 18, y);

  // Sexo e Idade na direita
  const sexoText = data.pacienteSexo || "N/I";
  const idadeText = data.pacienteIdade ? `${data.pacienteIdade}` : "N/I";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Sexo: `, PAGE_WIDTH - MARGIN - 40, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(sexoText, PAGE_WIDTH - MARGIN - 30, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`Idade: `, PAGE_WIDTH - MARGIN - 18, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(idadeText, PAGE_WIDTH - MARGIN - 6, y);

  y += 5;

  if (data.pacienteEndereco) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Endereco:", colLeft, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const pAddrLines = doc.splitTextToSize(data.pacienteEndereco, CONTENT_WIDTH - 20);
    doc.text(pAddrLines, colLeft + 18, y);
    y += pAddrLines.length * 3.5 + 2;
  }

  y += 3;

  // Linha separadora
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
      const num = String(index + 1);
      const qtd = String(med.quantidade);

      // Número
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate800);
      doc.text(num, MARGIN + 2, y);

      // Nome em bold + tracejado + quantidade
      doc.setFont("helvetica", "bold");
      const nomeWidth = doc.getTextWidth(med.nome + " ");
      doc.text(med.nome, MARGIN + 10, y);

      // Tracejado
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

      // Quantidade
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.slate800);
      doc.text(qtd, PAGE_WIDTH - MARGIN, y, { align: "right" });

      y += 7;

      // Posologia
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(med.posologia, MARGIN + 10, y);

      y += 10;
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
