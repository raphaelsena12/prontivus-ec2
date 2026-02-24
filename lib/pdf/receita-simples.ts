import {
  createDoc, drawClinicHeader,
  formatCPF, COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH, PDF_FONT,
} from "./pdf-base";

interface ReceitaSimplesData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  clinicaNumero?: string;
  clinicaBairro?: string;
  clinicaCidade?: string;
  clinicaEstado?: string;
  clinicaCep?: string;
  clinicaSite?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;
  medicoCpf?: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;
  pacienteEndereco?: string;
  pacienteNumero?: string;
  pacienteBairro?: string;
  pacienteCidade?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;

  dataEmissao: string;
  cidade?: string;

  medicamentos: Array<{
    nome: string;
    dosagem?: string;
    posologia: string;
  }>;
}

export function generateReceitaSimplesPDF(data: ReceitaSimplesData): ArrayBuffer {
  const doc = createDoc();

  drawClinicHeader(doc, data, "RECEITA MÉDICA");

  // Título centralizado logo abaixo do cabeçalho
  let y = 70; // Ajustado de 62 para 70 para acomodar cabeçalho bem mais baixo

  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RECEITA MÉDICA", PAGE_WIDTH / 2, y, { align: "center" });

  y += 14;

  // =====================================================
  // DADOS DO PACIENTE
  // =====================================================
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);

  // Linha: Paciente: Nome
  doc.setFont(PDF_FONT, "bold");
  doc.text("Paciente: ", MARGIN, y);
  const labelW = doc.getTextWidth("Paciente: ");
  doc.setFont(PDF_FONT, "normal");
  doc.text(data.pacienteNome, MARGIN + labelW, y);
  y += 6;

  // Linha: CPF   Nascimento   Idade   Sexo  (rótulo negrito, valor normal)
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate800);
  let xPos = MARGIN;
  const drawInfo = (label: string, value: string) => {
    doc.setFont(PDF_FONT, "bold");
    doc.text(label, xPos, y);
    xPos += doc.getTextWidth(label);
    doc.setFont(PDF_FONT, "normal");
    doc.text(value, xPos, y);
    xPos += doc.getTextWidth(value) + 8;
  };
  drawInfo("CPF: ", formatCPF(data.pacienteCpf));
  if (data.pacienteDataNascimento) drawInfo("Nascimento: ", data.pacienteDataNascimento);
  if (data.pacienteIdade) drawInfo("Idade: ", `${data.pacienteIdade} anos`);
  if (data.pacienteSexo) drawInfo("Sexo: ", data.pacienteSexo);
  y += 6;

  // Linha 3: Endereço completo (se disponível)
  const endParts: string[] = [];
  if (data.pacienteEndereco) endParts.push(data.pacienteEndereco);
  if (data.pacienteNumero) endParts.push(`nº ${data.pacienteNumero}`);
  if (data.pacienteBairro) endParts.push(data.pacienteBairro);
  if (data.pacienteCidade) endParts.push(data.pacienteCidade);
  if (endParts.length > 0) {
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text("Endereço: ", MARGIN, y);
    const endLabelW = doc.getTextWidth("Endereço: ");
    doc.setFont(PDF_FONT, "normal");
    const endText = doc.splitTextToSize(endParts.join(", "), CONTENT_WIDTH - endLabelW);
    doc.text(endText, MARGIN + endLabelW, y);
    y += endText.length * 5;
  }

  y += 10;

  // =====================================================
  // SUBTÍTULO PRESCRIÇÕES
  // =====================================================
  y += 4;
  doc.setFontSize(14);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("Prescrições", PAGE_WIDTH / 2, y, { align: "center" });
  y += 10;

  // =====================================================
  // MEDICAMENTOS - LISTA LIMPA SEM BOXES
  // =====================================================
  if (data.medicamentos.length === 0) {
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "italic");
    doc.setTextColor(...COLORS.slate400);
    doc.text("Nenhum medicamento prescrito", MARGIN, y);
    y += 10;
  } else {
    data.medicamentos.forEach((med, index) => {
      const num = String(index + 1);

      // Número simples
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(`${num}.`, MARGIN, y);

      // Nome do medicamento + dosagem em negrito
      const nomeCompleto = med.dosagem ? `${med.nome} ${med.dosagem}` : med.nome;
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(nomeCompleto, MARGIN + 8, y);

      y += 6;

      // Posologia
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate600);
      const posLines = doc.splitTextToSize(med.posologia, CONTENT_WIDTH - 8);
      doc.text(posLines, MARGIN + 8, y);
      y += posLines.length * 4.5 + 4;
    });
  }

  // =====================================================
  // ASSINATURA
  // =====================================================
  const sigY = Math.max(y + 20, PAGE_HEIGHT - 45);

  // Limpar prefixos duplicados do nome e CRM
  const medicoNomeLimpo = data.medicoNome.replace(/^Dr\.?a?\.?\s*/i, "");
  const medicoCrmLimpo = data.medicoCrm.replace(/^CRM[-\s]*/i, "");

  // Linha de assinatura (espaço para assinatura manual)
  const lineY = sigY + 10;
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 - 42, lineY, PAGE_WIDTH / 2 + 42, lineY);

  // Nome do médico
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${medicoNomeLimpo}`, PAGE_WIDTH / 2, lineY + 5, { align: "center" });

  // CRM e especialidade
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`${medicoCrmLimpo}  —  ${data.medicoEspecialidade}`, PAGE_WIDTH / 2, lineY + 10, { align: "center" });

  // Data abaixo do CRM
  const localData = data.cidade
    ? `${data.cidade}, ${data.dataEmissao}`
    : data.dataEmissao;
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(localData, PAGE_WIDTH / 2, lineY + 16, { align: "center" });

  return doc.output("arraybuffer");
}
