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
  pacienteMatricula?: string;
  pacienteRg?: string;
  pacienteEndereco?: string;
  pacienteNumero?: string;
  pacienteBairro?: string;
  pacienteCidade?: string;
  pacienteCep?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;
  pacienteCelular?: string;
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

export function formatCRM(crm: string): string {
  // Remove prefixo "CRM" ou "CRM-" se existir (case insensitive)
  const cleaned = crm.replace(/^CRM\s*-?\s*/i, "").trim();
  return cleaned || crm; // Retorna o valor limpo ou o original se estiver vazio
}

export function formatMedicoNome(nome: string): string {
  // Remove prefixos "Dr.", "Dr(a).", "Dra.", "Dr " se existir (case insensitive)
  const cleaned = nome.replace(/^(Dr\(a\)\.|Dra\.|Dr\.|Dr\s+)/i, "").trim();
  return cleaned || nome; // Retorna o valor limpo ou o original se estiver vazio
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
// CONTROLE DE PAGINAÇÃO
// =====================================================
const FOOTER_RESERVE = 28;

/** Verifica se há espaço suficiente na página; se não, adiciona nova página e retorna Y no topo */
export function checkPageBreak(doc: jsPDF, y: number, needed = 10): number {
  if (y + needed > PAGE_HEIGHT - FOOTER_RESERVE) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

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

/** Barra superior — removida conforme novo padrão visual */
export function drawTopBar(_doc: jsPDF): void {
  // não desenha mais barra decorativa no topo
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
    const logoY = 12; // Reduzido para diminuir o cabeçalho
    const maxH = 28; // Reduzido de 45 para 28mm
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
        doc.setFontSize(16);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(data.clinicaNome, MARGIN, logoY + 12);
      }
    } else {
      doc.setFontSize(16);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(data.clinicaNome, MARGIN, logoY + 12);
    }

    // Informações da clínica no lado direito com ícones
    const IS = 3;         // tamanho do ícone reduzido (mm)
    const IR = IS / 2;      // raio / metade
    const itemStartX = midX + 4; // Reduzido de 8 para 4 para melhor alinhamento
    const iconCX = itemStartX + IR;  // centro X do ícone
    const textX = itemStartX + IS + 3; // início do texto com mais espaço
    let infoY = logoY + 2; // Ajustado para melhor alinhamento vertical com logo menor

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
    doc.setFontSize(12);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.clinicaNome, itemStartX, infoY);
    infoY += 5.5; // Espaçamento ajustado

    doc.setFontSize(8.5); // Reduzido para ficar proporcional
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);

    if (data.clinicaTelefone) {
      drawPhoneIcon(infoY);
      doc.text(data.clinicaTelefone, textX, infoY);
      infoY += 5; // Espaçamento ajustado
    }

    if (data.clinicaEmail) {
      drawEmailIcon(infoY);
      doc.text(data.clinicaEmail, textX, infoY);
      infoY += 5; // Espaçamento ajustado
    }

    if (data.clinicaSite) {
      drawGlobeIcon(infoY);
      doc.text(data.clinicaSite, textX, infoY);
    }

    return 50; // Reduzido para acomodar o cabeçalho menor
  } else {
    // ── Layout padrão: logo grande à esquerda, informações da clínica à direita ──
    const logoY = 8;
    const maxH = 25; // Reduzido de 40 para 25mm
    const maxW = midX - MARGIN - 6;

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
        doc.setFontSize(14);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(data.clinicaNome, MARGIN, logoY + 14);
      }
    } else {
      doc.setFontSize(14);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(data.clinicaNome, MARGIN, logoY + 14);
    }

    // ── Informações da clínica: coluna direita, alinhadas à direita ──
    const rightX = PAGE_WIDTH - MARGIN;
    let infoY = logoY + 4;

    // Nome da clínica em destaque
    doc.setFontSize(11);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...COLORS.slate800);
    doc.text(data.clinicaNome, rightX, infoY, { align: "right" });
    infoY += 5;

    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);

    // Endereço: rua + número + bairro
    if (data.clinicaEndereco) {
      let addr = data.clinicaEndereco;
      if (data.clinicaNumero) addr += `, nº ${data.clinicaNumero}`;
      if (data.clinicaBairro) addr += ` — ${data.clinicaBairro}`;
      doc.text(addr, rightX, infoY, { align: "right" });
      infoY += 4.5;
    }

    // Cidade / Estado   CEP
    if (data.clinicaCidade || data.clinicaEstado) {
      const city = [data.clinicaCidade, data.clinicaEstado].filter(Boolean).join(" / ");
      const cepStr = data.clinicaCep ? `   CEP ${data.clinicaCep}` : "";
      doc.text(`${city}${cepStr}`, rightX, infoY, { align: "right" });
      infoY += 4.5;
    }

    // E-mail
    if (data.clinicaEmail) {
      doc.text(data.clinicaEmail, rightX, infoY, { align: "right" });
      infoY += 4.5;
    }

    // CNPJ
    doc.text(`CNPJ: ${formatCNPJ(data.clinicaCnpj)}`, rightX, infoY, { align: "right" });
    infoY += 4.5;

    // Telefone (abaixo do CNPJ)
    if (data.clinicaTelefone) {
      doc.text(`Tel: ${data.clinicaTelefone}`, rightX, infoY, { align: "right" });
    }

    // Linha separadora abaixo do cabeçalho
    const sepY = logoY + maxH + 6; // 8 + 25 + 6 = 39
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, sepY, PAGE_WIDTH - MARGIN, sepY);

    return sepY + 6; // 45
  }
}

/** Desenha título e subtítulo centralizados. Retorna Y após título */
export function drawTitle(doc: jsPDF, title: string, subtitle?: string, startY?: number): number {
  let y = (startY ?? 64) + 8;

  const centerX = PAGE_WIDTH / 2;

  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, centerX, y, { align: "center" });
  y += 7;

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(subtitle, centerX, y, { align: "center" });
    y += 5;
  }

  return y + 10;
}

/** Desenha identificação do paciente em grid de 3 colunas alinhadas. Retorna Y após seção */
export function drawPatientCard(doc: jsPDF, data: PacienteData, y: number): number {
  const FONT_SIZE = 9;
  const ROW_H = 6;

  // ── Posições fixas das 3 colunas (A4 170mm de conteúdo) ──
  const col1X = MARGIN;        // coluna esquerda
  const col2X = MARGIN + 60;   // coluna do meio
  const col3X = MARGIN + 120;  // coluna direita

  // Largura disponível para valor em cada coluna
  const col1ValMax = col2X - col1X - 2;
  const col2ValMax = col3X - col2X - 2;
  const col3ValMax = PAGE_WIDTH - MARGIN - col3X;

  /** Trunca texto (na fonte corrente) se ultrapassar maxW (mm) */
  const truncate = (text: string, maxW: number): string => {
    if (!text) return "";
    if (doc.getTextWidth(text) <= maxW) return text;
    let t = text;
    while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
    return t + "…";
  };

  /** Escreve label (cinza, normal) + valor (escuro, negrito) na posição x, ly com truncamento */
  const lv = (label: string, value: string, x: number, ly: number, colMaxW: number): void => {
    doc.setFontSize(FONT_SIZE);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(label, x, ly);
    const labelW = doc.getTextWidth(label);
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(...COLORS.slate800);
    const val = truncate(value || "", colMaxW - labelW);
    doc.text(val, x + labelW, ly);
  };

  // Título da seção
  doc.setFontSize(FONT_SIZE);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IDENTIFICAÇÃO DO PACIENTE", MARGIN, y);
  y += ROW_H;

  // Linha 1: Nº Prontuário | Nome Completo |
  lv("Nº Prontuário: ", data.pacienteMatricula || "", col1X, y, col1ValMax);
  lv("Nome Completo: ", data.pacienteNome.toUpperCase(), col2X, y, col2ValMax + col3ValMax);
  y += ROW_H;

  // Linha 2: Data Nascimento | RG | CPF
  lv("Data Nasc.: ", data.pacienteDataNascimento, col1X, y, col1ValMax);
  lv("RG: ", data.pacienteRg || "", col2X, y, col2ValMax);
  lv("CPF: ", formatCPF(data.pacienteCpf), col3X, y, col3ValMax);
  y += ROW_H;

  // Linha 3: Endereço | Bairro | Cidade
  lv("Endereço: ", data.pacienteEndereco || "", col1X, y, col1ValMax);
  lv("Bairro: ", data.pacienteBairro || "", col2X, y, col2ValMax);
  lv("Cidade: ", data.pacienteCidade || "", col3X, y, col3ValMax);
  y += ROW_H + 4;

  // Separador
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 6;
}

/** Desenha rodapé com assinatura do médico. Posiciona fixo no fim da página, alinhada à direita */
export function drawFooterSignature(
  doc: jsPDF,
  data: MedicoData & { dataEmissao: string; cidade?: string },
  minY?: number,
  options?: { hideDateLine?: boolean; hideSignatureLine?: boolean; hideSeparatorLine?: boolean }
): void {
  const sigY = options?.hideDateLine
    ? PAGE_HEIGHT - 30
    : Math.max(minY || 0, PAGE_HEIGHT - 80) + 28;

  if (!options?.hideDateLine) {
    const footerY = sigY - 28;

    if (!options?.hideSeparatorLine) {
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);
    }

    const localData = data.cidade
      ? `${data.cidade}, ${data.dataEmissao}`
      : data.dataEmissao;

    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(localData, PAGE_WIDTH / 2, footerY + 10, { align: "center" });
  }

  // Mesma posição do médico em drawDualSignature (quarto direito da página)
  const sigCenterX = MARGIN + (CONTENT_WIDTH * 3) / 4;

  // Traço da assinatura
  if (!options?.hideSignatureLine) {
    doc.setDrawColor(...COLORS.slate800);
    doc.setLineWidth(0.4);
    doc.line(sigCenterX - 35, sigY, sigCenterX + 35, sigY);
  }

  const nomeY = options?.hideSignatureLine ? sigY : sigY + 8;

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${formatMedicoNome(data.medicoNome)}`, sigCenterX, nomeY, { align: "center" });

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${formatCRM(data.medicoCrm)} — ${data.medicoEspecialidade}`, sigCenterX, nomeY + 6, { align: "center" });
}

/** Desenha rodapé com duas assinaturas (paciente + médico), fixas no rodapé da página */
export function drawDualSignature(
  doc: jsPDF,
  data: MedicoData & { pacienteNome: string; dataEmissao: string; cidade?: string },
  _minY?: number,
  options?: { hideDateLine?: boolean }
): void {
  // Assinaturas sempre fixas no final da página (abaixadas)
  const sigY = options?.hideDateLine
    ? PAGE_HEIGHT - 30
    : PAGE_HEIGHT - 43;

  if (!options?.hideDateLine) {
    const localData = data.cidade
      ? `${data.cidade}, ${data.dataEmissao}`
      : data.dataEmissao;

    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(localData, PAGE_WIDTH / 2, sigY - 10, { align: "center" });
  }

  const leftCenter = MARGIN + CONTENT_WIDTH / 4;
  const rightCenter = MARGIN + (CONTENT_WIDTH * 3) / 4;

  // ── Assinatura paciente (esquerda) ──
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(leftCenter - 35, sigY, leftCenter + 35, sigY);

  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome.toUpperCase(), leftCenter, sigY + 6, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Paciente ou Responsável", leftCenter, sigY + 11, { align: "center" });

  // ── Assinatura médico (direita) ──
  doc.setDrawColor(...COLORS.slate800);
  doc.line(rightCenter - 35, sigY, rightCenter + 35, sigY);

  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(`Dr(a). ${formatMedicoNome(data.medicoNome)}`, rightCenter, sigY + 6, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CRM ${formatCRM(data.medicoCrm)} — ${data.medicoEspecialidade}`, rightCenter, sigY + 11, { align: "center" });
}

/**
 * Desenha rodapé simples com informações da clínica (sem barras coloridas).
 * - Com `data`: linha separadora sutil + nome · contato.
 * - Sem `data`: texto legal genérico discreto.
 */
export function drawBottomBar(doc: jsPDF, data?: ClinicaData): void {
  const footerY = PAGE_HEIGHT - 16;

  // Linha separadora sutil
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

  if (data) {
    // Linha 1: nome da clínica + contatos
    const line1: string[] = [data.clinicaNome];
    if (data.clinicaTelefone) line1.push(`Tel: ${data.clinicaTelefone}`);
    if (data.clinicaEmail) line1.push(data.clinicaEmail);
    if (data.clinicaSite) line1.push(data.clinicaSite);

    doc.setFontSize(6.5);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(line1.join("  ·  "), PAGE_WIDTH / 2, footerY + 5, { align: "center" });

    // Linha 2: endereço + CNPJ
    const line2: string[] = [];
    if (data.clinicaEndereco) {
      let addr = data.clinicaEndereco;
      if (data.clinicaNumero) addr += `, nº ${data.clinicaNumero}`;
      if (data.clinicaBairro) addr += ` — ${data.clinicaBairro}`;
      line2.push(addr);
    }
    if (data.clinicaCidade || data.clinicaEstado) {
      line2.push([data.clinicaCidade, data.clinicaEstado].filter(Boolean).join(" / "));
    }
    if (data.clinicaCep) line2.push(`CEP ${data.clinicaCep}`);
    if (data.clinicaCnpj) line2.push(`CNPJ: ${formatCNPJ(data.clinicaCnpj)}`);

    if (line2.length > 0) {
      doc.setFontSize(6);
      doc.text(line2.join("  ·  "), PAGE_WIDTH / 2, footerY + 10, { align: "center" });
    }
  } else {
    doc.setFontSize(6);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate400);
    doc.text(
      "Documento gerado eletronicamente — Prontivus",
      PAGE_WIDTH / 2,
      footerY + 6,
      { align: "center" }
    );
  }
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

/**
 * Renderiza um parágrafo com trechos em negrito/normal inline, justificado.
 * Retorna Y após a última linha.
 */
export function drawRichParagraph(
  doc: jsPDF,
  segments: Array<{ text: string; bold?: boolean }>,
  x: number,
  startY: number,
  maxWidth: number,
  fontSize: number = 10,
  lineHeight: number = 5.5
): number {
  // Tokeniza em palavras (sem espaços), preservando bold
  const tokens: Array<{ word: string; bold: boolean }> = [];
  for (const seg of segments) {
    const words = seg.text.split(/\s+/).filter(w => w !== "");
    for (const word of words) {
      tokens.push({ word, bold: !!seg.bold });
    }
  }

  // Mede a largura de cada token na sua fonte correta
  const widths = tokens.map(t => {
    doc.setFontSize(fontSize);
    doc.setFont(PDF_FONT, t.bold ? "bold" : "normal");
    return doc.getTextWidth(t.word);
  });

  // Mede a largura de um espaço normal (font normal)
  doc.setFontSize(fontSize);
  doc.setFont(PDF_FONT, "normal");
  const spaceW = doc.getTextWidth(" ");

  // Tokens com flag indicando se devem ser colados ao token anterior (sem espaço)
  const isPunct = (w: string) => /^[,;:.!?)»\-]/.test(w);

  // Quebra os tokens em linhas, sem espaço antes de pontuação
  const lines: Array<Array<{ word: string; bold: boolean; width: number; noSpaceBefore: boolean }>> = [];
  let lineTokens: Array<{ word: string; bold: boolean; width: number; noSpaceBefore: boolean }> = [];
  let lineUsed = 0;

  for (let i = 0; i < tokens.length; i++) {
    const w = widths[i];
    const noSpaceBefore = isPunct(tokens[i].word);
    const needsSpace = lineTokens.length > 0 && !noSpaceBefore ? spaceW : 0;
    if (lineTokens.length > 0 && lineUsed + needsSpace + w > maxWidth) {
      lines.push(lineTokens);
      lineTokens = [{ ...tokens[i], width: w, noSpaceBefore: false }];
      lineUsed = w;
    } else {
      lineTokens.push({ ...tokens[i], width: w, noSpaceBefore });
      lineUsed += needsSpace + w;
    }
  }
  if (lineTokens.length > 0) lines.push(lineTokens);

  // Renderiza cada linha com justificação (exceto a última)
  // Gaps = espaços entre tokens que não são pontuação colada
  let curY = startY;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const isLastLine = li === lines.length - 1;

    const totalWordsW = line.reduce((s, t) => s + t.width, 0);
    const gapCount = line.filter((t, i) => i > 0 && !t.noSpaceBefore).length;
    const extraSpace = isLastLine || gapCount === 0
      ? spaceW
      : (maxWidth - totalWordsW) / gapCount;

    let curX = x;
    for (let ti = 0; ti < line.length; ti++) {
      const t = line[ti];
      doc.setFontSize(fontSize);
      doc.setFont(PDF_FONT, t.bold ? "bold" : "normal");
      doc.setTextColor(...COLORS.slate800);
      doc.text(t.word, curX, curY);
      if (ti < line.length - 1) {
        curX += t.width + (line[ti + 1].noSpaceBefore ? 0 : extraSpace);
      }
    }

    curY += lineHeight;
  }

  return curY;
}

/**
 * Renderiza texto plano justificado linha a linha.
 * As linhas devem ser pré-quebradas via doc.splitTextToSize().
 * A última linha é alinhada à esquerda.
 */
export function drawJustifiedText(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number = 11,
  lineHeight: number = 6.5
): number {
  doc.setFontSize(fontSize);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const isLastLine = li === lines.length - 1;
    const words = line.split(/\s+/).filter(w => w !== "");
    const gaps = words.length - 1;

    if (isLastLine || gaps === 0) {
      doc.text(line, x, y);
    } else {
      const totalW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
      const extra = (maxWidth - totalW) / gaps;
      let curX = x;
      for (let wi = 0; wi < words.length; wi++) {
        doc.text(words[wi], curX, y);
        curX += doc.getTextWidth(words[wi]) + (wi < words.length - 1 ? extra : 0);
      }
    }
    y += lineHeight;
  }
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
