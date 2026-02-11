import {
  createDoc, drawTopBar, drawBottomBar, formatCPF, formatCNPJ,
  COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface GuiaEncaminhamentoData {
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
  pacienteEndereco?: string;
  pacienteCelular?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;

  dataEmissao: string;
  cidade?: string;

  encaminharPara?: string;
  procedimentosSolicitados?: string;
  resumoHistoriaClinica?: string;
  hipoteseDiagnostica?: string;
  cidCodigo?: string;
  cidDescricao?: string;
  tipoVaga?: string;
}

export function generateGuiaEncaminhamentoPDF(data: GuiaEncaminhamentoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);

  // =====================================================
  // CABEÇALHO COM LOGO
  // =====================================================
  let y = 10;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, "WEBP", MARGIN, y, 35, 10);
    } catch { /* fallback abaixo */ }
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`${data.clinicaNome} - CNPJ ${formatCNPJ(data.clinicaCnpj)}`, MARGIN, y + 14);
  if (data.clinicaEndereco) {
    doc.text(data.clinicaEndereco, MARGIN, y + 18);
  }

  y += 24;

  // =====================================================
  // TÍTULO + TIPO DE VAGA
  // =====================================================
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH - 45, 16, 1, 1, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("GUIA DE ENCAMINHAMENTO", MARGIN + 5, y + 7);

  doc.setFontSize(8);
  doc.text("REFERENCIA E CONTRA REFERENCIA", MARGIN + 5, y + 12);

  // Box tipo de vaga
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(PAGE_WIDTH - MARGIN - 42, y, 42, 16, 1, 1, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("Tipo de vaga:", PAGE_WIDTH - MARGIN - 38, y + 5);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.tipoVaga || "ELETIVO", PAGE_WIDTH - MARGIN - 38, y + 12);

  y += 22;

  // =====================================================
  // SEÇÃO REFERÊNCIA
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 1, 1, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("REFERENCIA", MARGIN + 4, y + 6);

  y += 12;

  // De / Para
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Do", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.clinicaNome, MARGIN + 8, y);

  y += 6;

  // =====================================================
  // I - IDENTIFICAÇÃO
  // =====================================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("I - Identificacao", MARGIN, y);

  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Nome", MARGIN + 2, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN + 16, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data Nascimento", PAGE_WIDTH - MARGIN - 45, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteDataNascimento, PAGE_WIDTH - MARGIN - 10, y);

  y += 5;

  const idadeText = data.pacienteIdade ? `${data.pacienteIdade}A` : "N/I";
  const sexoText = data.pacienteSexo || "N/I";

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Idade", MARGIN + 2, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(idadeText, MARGIN + 16, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Sexo", MARGIN + 40, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(sexoText, MARGIN + 50, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("CPF", MARGIN + 70, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(formatCPF(data.pacienteCpf), MARGIN + 80, y);

  y += 5;

  if (data.pacienteEndereco) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Endereco", MARGIN + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.pacienteEndereco, MARGIN + 22, y);
    y += 5;
  }

  if (data.cidade) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Cidade", MARGIN + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.cidade, MARGIN + 16, y);
    y += 5;
  }

  if (data.pacienteCelular) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate600);
    doc.text("Celular", MARGIN + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.pacienteCelular, MARGIN + 16, y);
    y += 5;
  }

  y += 4;

  // =====================================================
  // II - PARA / III - PROCEDIMENTOS
  // =====================================================
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("II - PARA:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.encaminharPara || "", MARGIN + 20, y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("III - PROCEDIMENTOS SOLICITADOS:", MARGIN + 80, y);

  y += 5;

  if (data.procedimentosSolicitados) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const procLines = doc.splitTextToSize(data.procedimentosSolicitados, CONTENT_WIDTH - 4);
    doc.text(procLines, MARGIN + 2, y);
    y += procLines.length * 4 + 4;
  }

  y += 8;

  // =====================================================
  // IV - RESUMO DA HISTÓRIA CLÍNICA
  // =====================================================
  doc.setDrawColor(...COLORS.slate200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("IV - Resumo da Historia Clinica e Exames ja Realizados", MARGIN, y);

  y += 5;

  if (data.resumoHistoriaClinica) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const resLines = doc.splitTextToSize(data.resumoHistoriaClinica, CONTENT_WIDTH - 4);
    doc.text(resLines, MARGIN + 2, y);
    y += resLines.length * 4 + 4;
  }

  y += 8;

  // =====================================================
  // V - HIPÓTESE DIAGNÓSTICA
  // =====================================================
  doc.setDrawColor(...COLORS.slate200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("V - Hipotese Diagnostica", MARGIN, y);

  y += 5;

  if (data.cidCodigo) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const hipText = data.cidDescricao
      ? `${data.cidCodigo} - ${data.cidDescricao}`
      : data.cidCodigo;
    doc.text(hipText, MARGIN + 2, y);
    y += 6;
  }

  if (data.hipoteseDiagnostica) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    const hipLines = doc.splitTextToSize(data.hipoteseDiagnostica, CONTENT_WIDTH - 4);
    doc.text(hipLines, MARGIN + 2, y);
    y += hipLines.length * 4 + 4;
  }

  y += 8;

  // =====================================================
  // ASSINATURA REFERÊNCIA
  // =====================================================
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data ____/____/_________", MARGIN, y + 4);

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 + 10, y + 4, PAGE_WIDTH - MARGIN, y + 4);
  doc.setFontSize(7);
  doc.text("Assinatura e Carimbo", PAGE_WIDTH - MARGIN - 20, y + 8);

  y += 16;

  // =====================================================
  // SEÇÃO CONTRA REFERÊNCIA
  // =====================================================
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("CONTRA REFERENCIA", MARGIN, y);

  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Do ________________________________", MARGIN, y);
  doc.text("Para ________________________________", PAGE_WIDTH / 2, y);

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("I - Relatorio e Orientacoes", MARGIN, y);

  y += 5;

  // Linhas para preenchimento
  for (let i = 0; i < 4; i++) {
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  }

  y += 4;

  // Assinatura contra referência
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data ____/____/_________", MARGIN, y);

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 + 10, y, PAGE_WIDTH - MARGIN, y);
  doc.setFontSize(7);
  doc.text("Assinatura e Carimbo", PAGE_WIDTH - MARGIN - 20, y + 4);

  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
