import jsPDF from "jspdf";

// =====================================================
// TIPOS COMPARTILHADOS
// =====================================================
export interface ClinicaData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  logoBase64?: string;
}

export interface MedicoData {
  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;
}

export interface PacienteData {
  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;
}

export interface BaseDocumentData extends ClinicaData, MedicoData, PacienteData {
  dataEmissao: string;
  cidade?: string;
}

// =====================================================
// CORES DO SISTEMA
// =====================================================
export const COLORS = {
  slate800: [30, 41, 59] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  blue600: [37, 99, 235] as [number, number, number],
  red600: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// =====================================================
// HELPERS DE FORMATAÇÃO
// =====================================================
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return cnpj;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

export function extenso(num: number): string {
  const unidades = [
    "", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
    "dezessete", "dezoito", "dezenove",
  ];
  const dezenas = [
    "", "", "vinte", "trinta", "quarenta", "cinquenta",
    "sessenta", "setenta", "oitenta", "noventa",
  ];

  if (num < 20) return unidades[num];
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`;
  }
  return String(num);
}

// =====================================================
// CONSTANTES DE LAYOUT
// =====================================================
export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const MARGIN = 20;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// =====================================================
// FUNÇÕES DE LAYOUT COMPARTILHADAS
// =====================================================

/** Cria um novo documento jsPDF A4 portrait */
export function createDoc(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

/** Desenha a barra superior decorativa */
export function drawTopBar(doc: jsPDF): void {
  doc.setFillColor(...COLORS.slate800);
  doc.rect(0, 0, PAGE_WIDTH, 4, "F");
}

/** Desenha cabeçalho da clínica com logo e info. Retorna Y após cabeçalho */
export function drawClinicHeader(doc: jsPDF, data: ClinicaData): number {
  let y = 12;

  if (data.logoBase64) {
    try {
      // Renderizar logo com dimensões proporcionais para evitar distorção
      const logoHeight = 12;
      const logoWidth = 40;
      doc.addImage(data.logoBase64, "WEBP", MARGIN, y, logoWidth, logoHeight);
    } catch {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(data.clinicaNome, MARGIN, y + 8);
    }
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.clinicaNome, MARGIN, y + 8);
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  const rightX = PAGE_WIDTH - MARGIN;

  let infoY = y + 2;
  if (data.clinicaEndereco) {
    doc.text(data.clinicaEndereco, rightX, infoY, { align: "right" });
    infoY += 3.5;
  }
  if (data.clinicaTelefone) {
    doc.text(`Tel: ${data.clinicaTelefone}`, rightX, infoY, { align: "right" });
    infoY += 3.5;
  }
  if (data.clinicaEmail) {
    doc.text(data.clinicaEmail, rightX, infoY, { align: "right" });
    infoY += 3.5;
  }
  doc.text(`CNPJ: ${formatCNPJ(data.clinicaCnpj)}`, rightX, infoY, { align: "right" });

  y = 30;
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 10;
}

/** Desenha título e subtítulo centralizado. Retorna Y após título */
export function drawTitle(doc: jsPDF, title: string, subtitle?: string): number {
  let y = 40;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, PAGE_WIDTH / 2, y, { align: "center" });

  y += 6;

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text(subtitle, PAGE_WIDTH / 2, y, { align: "center" });
  }

  return y + 14;
}

/** Desenha identificação do paciente sem box colorido. Retorna Y após seção */
export function drawPatientCard(doc: jsPDF, data: PacienteData, y: number): number {
  const startY = y;

  // Label da seção
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PACIENTE", MARGIN, y);
  y += 5;

  // Nome do paciente em destaque
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN, y);

  y += 6;

  // Informações do paciente
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  const pacienteInfo = `CPF: ${formatCPF(data.pacienteCpf)}     |     Data de Nascimento: ${data.pacienteDataNascimento}`;
  doc.text(pacienteInfo, MARGIN, y);

  y += 8;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 10;
}

/** Desenha rodapé com assinatura do médico. Posiciona fixo no fim da página */
export function drawFooterSignature(
  doc: jsPDF,
  data: MedicoData & { dataEmissao: string; cidade?: string },
  minY?: number
): void {
  const footerY = Math.max(minY || 0, PAGE_HEIGHT - 80);

  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

  const localData = data.cidade
    ? `${data.cidade}, ${data.dataEmissao}`
    : data.dataEmissao;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(localData, PAGE_WIDTH / 2, footerY + 10, { align: "center" });

  const sigY = footerY + 28;

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 - 40, sigY, PAGE_WIDTH / 2 + 40, sigY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, PAGE_WIDTH / 2, sigY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${data.medicoCrm} — ${data.medicoEspecialidade}`, PAGE_WIDTH / 2, sigY + 10, { align: "center" });
}

/** Desenha rodapé com duas assinaturas (paciente + médico) */
export function drawDualSignature(
  doc: jsPDF,
  data: MedicoData & { pacienteNome: string; dataEmissao: string; cidade?: string },
  minY?: number
): void {
  const footerY = Math.max(minY || 0, PAGE_HEIGHT - 80);

  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

  const localData = data.cidade
    ? `${data.cidade}, ${data.dataEmissao}`
    : data.dataEmissao;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(localData, PAGE_WIDTH / 2, footerY + 10, { align: "center" });

  const sigY = footerY + 28;
  const leftCenter = MARGIN + CONTENT_WIDTH / 4;
  const rightCenter = MARGIN + (CONTENT_WIDTH * 3) / 4;

  // Assinatura paciente (esquerda)
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(leftCenter - 35, sigY, leftCenter + 35, sigY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Paciente ou Responsavel", leftCenter, sigY + 5, { align: "center" });

  // Assinatura médico (direita)
  doc.line(rightCenter - 35, sigY, rightCenter + 35, sigY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, rightCenter, sigY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${data.medicoCrm}`, rightCenter, sigY + 10, { align: "center" });
}

/** Desenha barra inferior e texto legal */
export function drawBottomBar(doc: jsPDF): void {
  doc.setFillColor(...COLORS.slate800);
  doc.rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, "F");

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate400);
  doc.text(
    "Este documento foi gerado eletronicamente pelo sistema Prontivus e possui validade legal conforme legislacao vigente.",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 7,
    { align: "center" }
  );
}

/** Desenha seção de label + conteúdo */
export function drawSectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text(label, MARGIN, y);
  return y + 6;
}

/** Desenha seção de observações sem box colorido. Retorna Y após seção */
export function drawObservationCard(doc: jsPDF, text: string, y: number): number {
  // Label da seção
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("OBSERVAÇÕES", MARGIN, y);
  y += 6;

  // Texto das observações
  const obsText = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.setLineHeightFactor(1.5);
  doc.text(obsText, MARGIN, y);

  y += obsText.length * 5 + 8;

  return y;
}

/** Desenha campo de formulário inline (label: valor) dentro de um card */
export function drawFieldRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth?: number
): number {
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text(label, x, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  if (maxWidth) {
    const lines = doc.splitTextToSize(value || "—", maxWidth);
    doc.text(lines, x, y + 4);
    return y + 4 + lines.length * 4;
  }
  doc.text(value || "—", x, y + 4);
  return y + 8;
}
