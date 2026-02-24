import jsPDF from "jspdf";
import { getInterFonts } from "./load-inter-font";

// =====================================================
// TIPOS COMPARTILHADOS
// =====================================================
export interface ClinicaData {
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

/** Fonte ativa nos documentos PDF (Inter se disponível, helvetica como fallback) */
export let PDF_FONT = "helvetica";

/** Cria um novo documento jsPDF A4 portrait, registrando a fonte Inter se disponível */
export function createDoc(): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fonts = getInterFonts();
  if (fonts) {
    doc.addFileToVFS("Inter-Regular.ttf", fonts.regular);
    doc.addFont("Inter-Regular.ttf", "Inter", "normal");
    doc.addFileToVFS("Inter-Bold.ttf", fonts.bold);
    doc.addFont("Inter-Bold.ttf", "Inter", "bold");
    if (fonts.italic) {
      doc.addFileToVFS("Inter-Italic.ttf", fonts.italic);
      doc.addFont("Inter-Italic.ttf", "Inter", "italic");
    }
    PDF_FONT = "Inter";
  } else {
    PDF_FONT = PDF_FONT;
  }
  return doc;
}

/** Desenha a barra superior decorativa */
export function drawTopBar(doc: jsPDF): void {
  doc.setFillColor(...COLORS.slate800);
  doc.rect(0, 0, PAGE_WIDTH, 4, "F");
}

/**
 * Desenha cabeçalho da clínica.
 * - Com `title`: layout dividido — logo (metade esquerda) | título do documento (metade direita).
 * - Sem `title`: layout legado — logo à esquerda, info de contato à direita.
 * Retorna Y após o cabeçalho.
 */
export function drawClinicHeader(doc: jsPDF, data: ClinicaData, title?: string): number {
  const midX = PAGE_WIDTH / 2;

  if (title) {
    // ── Layout moderno: logo (esquerda) | informações da clínica (direita) ──
    const logoY = 20; // Aumentado de 12 para 20 para abaixar bem mais do topo
    const maxH = 45; // Aumentado de 35 para 45mm
    const maxW = midX - MARGIN - 8; // Mais espaço para o logo

    // Logo na metade esquerda
    if (data.logoBase64) {
      try {
        const props = doc.getImageProperties(data.logoBase64);
        const ratio = props.width / props.height;
        let logoW = maxH * ratio;
        let logoH = maxH;
        if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
        const logoTopY = logoY + (maxH - logoH) / 2;
        const imgFmt = data.logoBase64.startsWith("data:image/png") ? "PNG" : "WEBP";
        doc.addImage(data.logoBase64, imgFmt, MARGIN, logoTopY, logoW, logoH);
      } catch {
        doc.setFontSize(18);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(data.clinicaNome, MARGIN, logoY + 20);
      }
    } else {
      doc.setFontSize(18);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(data.clinicaNome, MARGIN, logoY + 20);
    }

    // Informações da clínica no lado direito com ícones
    const IS = 3.5;         // tamanho do ícone aumentado (mm)
    const IR = IS / 2;      // raio / metade
    const itemStartX = midX + 4; // Reduzido de 8 para 4 para melhor alinhamento
    const iconCX = itemStartX + IR;  // centro X do ícone
    const textX = itemStartX + IS + 3; // início do texto com mais espaço
    let infoY = logoY + 4; // Ajustado para melhor alinhamento vertical

    // Ícone de telefone: rounded rect com 2 linhas brancas
    const drawPhoneIcon = (ty: number) => {
      const ic = ty - 1.2;
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(iconCX - IR, ic - IR, IS, IS, 0.6, 0.6, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.25);
      doc.line(iconCX - 0.9, ic - 0.4, iconCX + 0.9, ic - 0.4);
      doc.line(iconCX - 0.9, ic + 0.4, iconCX + 0.9, ic + 0.4);
    };

    // Ícone de email: rect com V no topo (envelope)
    const drawEmailIcon = (ty: number) => {
      const ic = ty - 1.2;
      doc.setFillColor(37, 99, 235);
      doc.rect(iconCX - IR, ic - IR, IS, IS, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.25);
      doc.line(iconCX - IR, ic - IR, iconCX, ic + 0.2);
      doc.line(iconCX, ic + 0.2, iconCX + IR, ic - IR);
    };

    // Ícone de globo: círculo com cruz branca
    const drawGlobeIcon = (ty: number) => {
      const ic = ty - 1.2;
      doc.setFillColor(37, 99, 235);
      doc.circle(iconCX, ic, IR, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.25);
      doc.line(iconCX - IR, ic, iconCX + IR, ic);
      doc.line(iconCX, ic - IR, iconCX, ic + IR);
    };

    // Nome da clínica (alinhado à esquerda junto com os demais itens)
    doc.setFontSize(14);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.clinicaNome, itemStartX, infoY);
    infoY += 6.5; // Espaçamento ajustado

    doc.setFontSize(9.5); // Aumentado de 9 para 9.5
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);

    if (data.clinicaTelefone) {
      drawPhoneIcon(infoY);
      doc.text(data.clinicaTelefone, textX, infoY);
      infoY += 5.5; // Espaçamento ajustado
    }

    if (data.clinicaEmail) {
      drawEmailIcon(infoY);
      doc.text(data.clinicaEmail, textX, infoY);
      infoY += 5.5; // Espaçamento ajustado
    }

    if (data.clinicaSite) {
      drawGlobeIcon(infoY);
      doc.text(data.clinicaSite, textX, infoY);
    }

    return 67; // Aumentado de 59 para 67 para acomodar o cabeçalho bem mais baixo
  } else {
    // ── Layout legado: logo à esquerda, info de contato à direita ──
    const logoY = 8;
    if (data.logoBase64) {
      try {
        const props = doc.getImageProperties(data.logoBase64);
        const maxH = 18;
        const maxW = midX - MARGIN - 6;
        const ratio = props.width / props.height;
        let logoW = maxH * ratio;
        let logoH = maxH;
        if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
        const logoTopY = logoY + (maxH - logoH) / 2;
        const imgFmt = data.logoBase64.startsWith("data:image/png") ? "PNG" : "WEBP";
        doc.addImage(data.logoBase64, imgFmt, MARGIN, logoTopY, logoW, logoH);
      } catch {
        doc.setFontSize(14);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(data.clinicaNome, MARGIN, logoY + 10);
      }
    } else {
      doc.setFontSize(14);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(data.clinicaNome, MARGIN, logoY + 10);
    }

    doc.setFontSize(7.5);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    const rightX = PAGE_WIDTH - MARGIN;
    let infoY = logoY + 2;
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

    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 30, PAGE_WIDTH - MARGIN, 30);

    return 40;
  }
}

/** Desenha título e subtítulo centralizado. Retorna Y após título */
export function drawTitle(doc: jsPDF, title: string, subtitle?: string): number {
  let y = 40;

  doc.setFontSize(20);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, PAGE_WIDTH / 2, y, { align: "center" });

  y += 6;

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text(subtitle, PAGE_WIDTH / 2, y, { align: "center" });
  }

  return y + 14;
}

/** Desenha identificação do paciente sem box colorido. Retorna Y após seção */
export function drawPatientCard(doc: jsPDF, data: PacienteData, y: number): number {
  // Label da seção
  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PACIENTE", MARGIN, y);
  y += 5;

  // Nome do paciente em destaque
  doc.setFontSize(13);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN, y);

  y += 6;

  // Informações do paciente
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
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
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(localData, PAGE_WIDTH / 2, footerY + 10, { align: "center" });

  const sigY = footerY + 28;

  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH / 2 - 40, sigY, PAGE_WIDTH / 2 + 40, sigY);

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, PAGE_WIDTH / 2, sigY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
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
  doc.setFont(PDF_FONT, "normal");
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
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Paciente ou Responsavel", leftCenter, sigY + 5, { align: "center" });

  // Assinatura médico (direita)
  doc.line(rightCenter - 35, sigY, rightCenter + 35, sigY);

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${data.medicoNome}`, rightCenter, sigY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${data.medicoCrm}`, rightCenter, sigY + 10, { align: "center" });
}

/**
 * Desenha barra inferior do documento.
 * - Com `data`: exibe endereço, telefone, e-mail e site da clínica.
 * - Sem `data`: exibe texto legal genérico (comportamento legado).
 */
export function drawBottomBar(doc: jsPDF, data?: ClinicaData): void {
  if (data) {
    const footerTop = PAGE_HEIGHT - 30;

    // Linha decorativa azul acima do rodapé
    doc.setDrawColor(...COLORS.blue600);
    doc.setLineWidth(0.6);
    doc.line(0, footerTop, PAGE_WIDTH, footerTop);

    // Fundo sutil do rodapé
    doc.setFillColor(248, 250, 252); // slate50
    doc.rect(0, footerTop, PAGE_WIDTH, 26, "F");

    let lineY = footerTop + 6;

    // Linha 1: nome da clínica (destaque)
    doc.setFontSize(7.5);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.clinicaNome, PAGE_WIDTH / 2, lineY, { align: "center" });
    lineY += 5;

    // Linha 2: endereço, número, bairro, cidade, UF, CEP
    const addrParts: string[] = [];
    if (data.clinicaEndereco) {
      let addr = data.clinicaEndereco;
      if (data.clinicaNumero) addr += `, nº ${data.clinicaNumero}`;
      addrParts.push(addr);
    }
    if (data.clinicaBairro) addrParts.push(data.clinicaBairro);
    if (data.clinicaCidade || data.clinicaEstado) {
      const city = [data.clinicaCidade, data.clinicaEstado].filter(Boolean).join(" / ");
      addrParts.push(city);
    }
    if (data.clinicaCep) addrParts.push(`CEP ${data.clinicaCep}`);
    if (addrParts.length > 0) {
      doc.setFontSize(6.5);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(addrParts.join("  ·  "), PAGE_WIDTH / 2, lineY, { align: "center" });
      lineY += 5;
    }

    // Linha 3: telefone · e-mail · site
    const contactParts: string[] = [];
    if (data.clinicaTelefone) contactParts.push(`Tel: ${data.clinicaTelefone}`);
    if (data.clinicaEmail) contactParts.push(data.clinicaEmail);
    if (data.clinicaSite) contactParts.push(data.clinicaSite);
    if (contactParts.length > 0) {
      doc.setFontSize(6.5);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate600);
      doc.text(contactParts.join("  ·  "), PAGE_WIDTH / 2, lineY, { align: "center" });
    }
  } else {
    // Texto legal genérico (comportamento legado)
    doc.setFontSize(6);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text(
      "Este documento foi gerado eletronicamente pelo sistema Prontivus e possui validade legal conforme legislacao vigente.",
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 7,
      { align: "center" }
    );
  }

  // Barra escura no rodapé
  doc.setFillColor(...COLORS.slate800);
  doc.rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, "F");
}

/** Desenha seção de label + conteúdo */
export function drawSectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text(label, MARGIN, y);
  return y + 6;
}

/** Desenha seção de observações sem box colorido. Retorna Y após seção */
export function drawObservationCard(doc: jsPDF, text: string, y: number): number {
  // Label da seção
  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("OBSERVAÇÕES", MARGIN, y);
  y += 6;

  // Texto das observações
  const obsText = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.setFontSize(9.5);
  doc.setFont(PDF_FONT, "normal");
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
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text(label, x, y);

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  if (maxWidth) {
    const lines = doc.splitTextToSize(value || "—", maxWidth);
    doc.text(lines, x, y + 4);
    return y + 4 + lines.length * 4;
  }
  doc.text(value || "—", x, y + 4);
  return y + 8;
}
