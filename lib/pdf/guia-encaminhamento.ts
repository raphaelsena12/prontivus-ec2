import {
  createDoc, drawTopBar, drawBottomBar, drawClinicHeader, formatCPF, formatCNPJ,
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
  drawClinicHeader(doc, data);

  let y = 40;

  // =====================================================
  // TÍTULO + TIPO DE VAGA
  // =====================================================
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("GUIA DE ENCAMINHAMENTO", PAGE_WIDTH / 2, y, { align: "center" });

  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate400);
  doc.text("REFERÊNCIA E CONTRA-REFERÊNCIA", PAGE_WIDTH / 2, y, { align: "center" });

  y += 8;

  // Tipo de vaga à direita
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("Tipo de vaga:", PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.tipoVaga || "ELETIVO", PAGE_WIDTH - MARGIN, y, { align: "right" });

  y += 10;

  // Linha separadora
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // =====================================================
  // SEÇÃO REFERÊNCIA
  // =====================================================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("REFERÊNCIA", MARGIN, y);

  y += 8;

  // De / Para
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("De:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.clinicaNome, MARGIN + 12, y);

  y += 6;

  // =====================================================
  // I - IDENTIFICAÇÃO
  // =====================================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("I - IDENTIFICAÇÃO", MARGIN, y);
  
  let identY = y + 6;

  identY += 6;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.setFontSize(7.5);
  doc.text("Nome:", MARGIN, identY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN + 17, identY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data Nascimento:", PAGE_WIDTH - MARGIN - 50, identY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteDataNascimento, PAGE_WIDTH - MARGIN, identY);

  identY += 6;

  const idadeText = data.pacienteIdade ? `${data.pacienteIdade} anos` : "N/I";
  const sexoText = data.pacienteSexo || "N/I";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate600);
  doc.text("Idade:", MARGIN, identY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(idadeText, MARGIN + 17, identY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate600);
  doc.text("Sexo:", MARGIN + 42, identY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(sexoText, MARGIN + 54, identY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate600);
  doc.text("CPF:", MARGIN + 77, identY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(formatCPF(data.pacienteCpf), MARGIN + 92, identY);

  identY += 6;

  if (data.pacienteEndereco) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate600);
    doc.text("Endereço:", MARGIN, identY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.pacienteEndereco, MARGIN + 22, identY);
    identY += 5;
  }

  if (data.cidade) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate600);
    doc.text("Cidade:", MARGIN, identY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.cidade, MARGIN + 17, identY);
    identY += 5;
  }

  if (data.pacienteCelular) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate600);
    doc.text("Celular:", MARGIN, identY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.pacienteCelular, MARGIN + 17, identY);
    identY += 5;
  }

  y = identY + 6;

  // =====================================================
  // II - PARA / III - PROCEDIMENTOS
  // =====================================================
  y += 6;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("II - PARA:", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.encaminharPara || "", MARGIN + 22, y);

  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate400);
  doc.text("III - PROCEDIMENTOS SOLICITADOS:", MARGIN, y);

  y += 6;

  if (data.procedimentosSolicitados) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.4);
    const procLines = doc.splitTextToSize(data.procedimentosSolicitados, CONTENT_WIDTH);
    doc.text(procLines, MARGIN, y);
    y += procLines.length * 4.5 + 6;
  } else {
    y += 6;
  }

  // =====================================================
  // IV - RESUMO DA HISTÓRIA CLÍNICA
  // =====================================================
  y += 6;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("IV - RESUMO DA HISTÓRIA CLÍNICA E EXAMES JÁ REALIZADOS", MARGIN, y);

  y += 6;

  if (data.resumoHistoriaClinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.4);
    const resLines = doc.splitTextToSize(data.resumoHistoriaClinica, CONTENT_WIDTH);
    doc.text(resLines, MARGIN, y);
    y += resLines.length * 4.5 + 6;
  } else {
    y += 6;
  }

  // =====================================================
  // V - HIPÓTESE DIAGNÓSTICA
  // =====================================================
  y += 6;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("V - HIPÓTESE DIAGNÓSTICA", MARGIN, y);

  y += 6;

  if (data.cidCodigo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.slate800);
    const hipText = data.cidDescricao
      ? `${data.cidCodigo} - ${data.cidDescricao}`
      : data.cidCodigo;
    doc.text(hipText, MARGIN, y);
    y += 7;
  }

  if (data.hipoteseDiagnostica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.4);
    const hipLines = doc.splitTextToSize(data.hipoteseDiagnostica, CONTENT_WIDTH);
    doc.text(hipLines, MARGIN, y);
    y += hipLines.length * 4.5 + 6;
  } else {
    y += 6;
  }

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
