import jsPDF from "jspdf";
import { getInterFonts } from "./load-inter-font";

// =====================================================================
// GUIA DE SERVIÇO PROFISSIONAL / SP/SADT — IAMSPE
// Padrão TISS – ANS  |  A4 Paisagem 297 × 210 mm
// =====================================================================

const W   = 297;
const H   = 210;
const M   = 5;          // margem
const CW  = W - 2 * M; // largura útil: 287 mm

// Paleta IAMSPE exata
const GREEN: [number, number, number]      = [48, 105, 83];   // #306953 — bordas, texto, cabeçalhos
const CELL_BG: [number, number, number]    = [210, 248, 249]; // #d2f8f9 — fundo dos campos
const WHITE: [number, number, number]      = [255, 255, 255];
// Alias para manter compatibilidade interna
const TEAL = GREEN;

// Alturas padrão
const SH  = 3.5;  // section header
const RH  = 7;    // regular row
const THH = 5;    // table header row
const TH  = 4;    // table data row

let _font = "helvetica";

function initFont(doc: jsPDF): void {
  const fonts = getInterFonts();
  if (fonts) {
    doc.addFileToVFS("IR-spsadt.ttf", fonts.regular);
    doc.addFont("IR-spsadt.ttf", "SPSADT", "normal");
    doc.addFileToVFS("IB-spsadt.ttf", fonts.bold);
    doc.addFont("IB-spsadt.ttf", "SPSADT", "bold");
    _font = "SPSADT";
  }
}

// ─── Primitivos ──────────────────────────────────────────────────────

/** Célula numerada: fundo branco, borda teal + rótulo pequeno em teal no topo-esquerdo */
function fc(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  num: string, label: string,
): void {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.18);
  doc.rect(x, y, w, h, "FD");

  if (num || label) {
    const txt = num ? `${num} - ${label}` : label;
    doc.setTextColor(...TEAL);
    // Reduz fonte até caber na largura da célula
    let fs = 4.2;
    doc.setFont(_font, "normal");
    doc.setFontSize(fs);
    while (doc.getTextWidth(txt) > w - 1.2 && fs > 3.0) {
      fs -= 0.15;
      doc.setFontSize(fs);
    }
    doc.text(txt, x + 0.6, y + 2.5);
  }
}

/** Cabeçalho de seção: fundo teal claro, texto teal bold (igual ao original IAMSPE) */
function sh(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string,
): number {
  doc.setFillColor(...CELL_BG);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.18);
  doc.rect(x, y, w, h, "S");
  // Reduz fonte até o texto caber na largura disponível
  let fs = 5.2;
  doc.setFont(_font, "bold");
  doc.setFontSize(fs);
  while (doc.getTextWidth(label) > w - 2.4 && fs > 3.5) {
    fs -= 0.2;
    doc.setFontSize(fs);
  }
  doc.setTextColor(...TEAL);
  doc.text(label, x + 1.2, y + h / 2 + fs * 0.18);
  return y + h;
}

/** Quadrado de checkbox */
function cbox(doc: jsPDF, x: number, y: number, s = 2.6): void {
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.2);
  doc.rect(x, y - s + 0.3, s, s, "S");
}

/** Marca checkbox com X centralizado */
function markCheckbox(doc: jsPDF, x: number, y: number, s = 2.6): void {
  doc.setFontSize(5);
  doc.setFont(_font, "bold");
  doc.setTextColor(...TEAL);
  const checkboxTopY = y - s + 0.3;
  const checkboxCenterX = x + s / 2;
  const checkboxCenterY = checkboxTopY + s / 2;
  const xCharWidth = doc.getTextWidth("X");
  doc.text("X", checkboxCenterX - xCharWidth / 2, checkboxCenterY + 0.3);
}

/** Texto inline em teal pequeno */
function tealText(doc: jsPDF, text: string, x: number, y: number, size = 4.2): void {
  doc.setFontSize(size);
  doc.setFont(_font, "normal");
  doc.setTextColor(...TEAL);
  doc.text(text, x, y);
}

/** Renderiza valor de texto dentro de um campo */
function renderFieldValue(doc: jsPDF, value: string, x: number, y: number, w: number, fontSize = 5): void {
  if (!value) return;
  doc.setFontSize(fontSize);
  doc.setFont(_font, "normal");
  doc.setTextColor(...TEAL);
  doc.text(value, x + 1, y + 5, { maxWidth: w - 2 });
}

/**
 * Preenche valores dentro das caixinhas (dbox) alinhando cada caractere
 * pattern: padrão das caixinhas (ex: "XXXXXXX", "XX/XX/XXXX")
 * value: valor a ser preenchido (ex: "1234567", "15/01/2024")
 */
function fillDbox(
  doc: jsPDF,
  x: number, y: number,
  pattern: string,
  value: string,
  bw = 2.4, bh = 2.0,
): void {
  if (!value) return;
  doc.setFontSize(5); // Aumentado de 4 para 5 (1px a mais)
  doc.setFont(_font, "normal");
  doc.setTextColor(...TEAL);
  
  // Remove separadores do valor para alinhar corretamente
  const valueClean = value.replace(/[/\-: ]/g, "");
  
  let cx = x;
  let valueIdx = 0;
  
  for (const ch of pattern) {
    if (ch === "/" || ch === "-" || ch === ":" || ch === " ") {
      // Separador - já está desenhado pelo dbox, apenas avança
      cx += ch === " " ? 1 : 1.8;
    } else {
      // Caixinha - preenche se houver valor
      if (valueIdx < valueClean.length) {
        const char = valueClean[valueIdx];
        // Centralizar caractere na caixinha
        const charWidth = doc.getTextWidth(char);
        doc.text(char, cx + (bw - charWidth) / 2, y + bh - 0.5);
        valueIdx++;
      }
      cx += bw;
    }
  }
}

/**
 * Fileira de caixinhas de dígito individuais.
 * `pattern`: cada caractere é uma caixinha, '/' '-' ':' são separadores.
 */
function dbox(
  doc: jsPDF,
  x: number, y: number,
  pattern: string,
  bw = 2.4, bh = 2.0,
): void {
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.15);
  let cx = x;
  for (const ch of pattern) {
    if (ch === "/" || ch === "-" || ch === ":" || ch === " ") {
      doc.setFontSize(4);
      doc.setFont(_font, "normal");
      doc.setTextColor(...TEAL);
      if (ch !== " ") doc.text(ch, cx + 0.2, y + bh - 0.5);
      cx += ch === " " ? 1 : 1.8;
    } else {
      // Forma U: esquerda + fundo + direita (sem borda de cima)
      doc.line(cx,      y,      cx,      y + bh); // esquerda
      doc.line(cx,      y + bh, cx + bw, y + bh); // fundo
      doc.line(cx + bw, y,      cx + bw, y + bh); // direita
      cx += bw;
    }
  }
}

// ─── Logo IAMSPE ──────────────────────────────────────────────────────

/**
 * Calcula as dimensões proporcionais da imagem para caber no espaço disponível
 * mantendo a proporção original
 */
function calculateImageDimensions(
  doc: jsPDF,
  imageBase64: string,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Obter propriedades da imagem
  const imgProps = doc.getImageProperties(imageBase64);
  const imgWidth = imgProps.width;
  const imgHeight = imgProps.height;
  
  // Calcular proporção original
  const aspectRatio = imgWidth / imgHeight;
  
  // Calcular dimensões mantendo proporção
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  // Se a altura calculada exceder o máximo, ajustar pela altura
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }
  
  return { width, height };
}

function drawIamspe(doc: jsPDF, x: number, y: number, _areaW: number, areaH: number): void {
  doc.setFillColor(...TEAL);

  // Folha esquerda — elipse inclinada simulada com círculos sobrepostos
  const cx = x + 6, cy = y + areaH / 2 - 0.5;
  doc.circle(cx - 1.5, cy - 2.2, 2.8, "F");
  doc.circle(cx + 1.5, cy + 2.2, 2.8, "F");

  // "apagar" a parte central com branco para dar efeito de folha dupla
  doc.setFillColor(...WHITE);
  doc.circle(cx, cy, 1.6, "F");

  // Linha de caule
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(cx, cy + 2.5, cx, cy + 4);

  // Texto "Iamspe"
  doc.setFontSize(8.5);
  doc.setFont(_font, "bold");
  doc.setTextColor(...TEAL);
  doc.text("Iamspe", x + 13, y + areaH / 2 + 3.2);
}

// =====================================================================
// GERADOR PRINCIPAL
// =====================================================================
export interface ExameSolicitadoSADT {
  nome: string;
  tipo?: string;
  justificativa?: string;
  codigoTuss?: string | null;
  quantidade?: number;
}

export interface GuiaSADTInput {
  // Beneficiário
  pacienteNome: string;
  pacienteCns?: string;
  numeroCarteirinha?: string;
  // Contratado Solicitante
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaCodigoCnes?: string;
  medicoNome: string;
  medicoCrm: string;
  medicoUf?: string;
  medicoCodigoCbo?: string;
  // Solicitação
  dataEmissao: string;
  cidCodigo?: string;
  indicacaoClinica?: string;
}

export function generateGuiaConsultaTISSPDF(
  data: GuiaSADTInput,
  logoBase64?: string,
  examesSolicitados: ExameSolicitadoSADT[] = [],
  prioridade: "eletiva" | "urgencia" = "eletiva",
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  initFont(doc);

  let y = M;

  // ===================================================================
  // CABEÇALHO: Logo (esquerda) | Título (centro) | 2-Nº (direita)
  // ===================================================================
  const HDR_H = 10;
  const LOGO_W  = 50; // logo aumentado
  const F2_W    = 48; // espaço para 2-Nº à direita
  const TITLE_W = CW - LOGO_W - F2_W; // espaço para o título no meio

  // borda geral (sem separadores verticais)
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CW, HDR_H, "S");

  // ── Logo à esquerda (com padding interno) ──
  const LOGO_PADDING = 0.8; // padding interno para não encostar na borda
  if (logoBase64) {
    const maxLogoWidth = LOGO_W - 2 * LOGO_PADDING;
    const maxLogoHeight = HDR_H - 2 * LOGO_PADDING;
    const imgDims = calculateImageDimensions(doc, logoBase64, maxLogoWidth, maxLogoHeight);
    
    // Com padding interno
    const logoX = M + LOGO_PADDING;
    const logoY = y + LOGO_PADDING;
    
    doc.addImage(logoBase64, "PNG", logoX, logoY, imgDims.width, imgDims.height);
  } else {
    drawIamspe(doc, M + LOGO_PADDING, y + LOGO_PADDING, LOGO_W - 2 * LOGO_PADDING, HDR_H - 2 * LOGO_PADDING);
  }

  // ── Título no centro ──
  {
    const titleTxt = "GUIA DE SERVIÇO PROFISSIONAL / SERVIÇO AUXILIAR DE DIAGNÓSTICO E TERAPIA - SP/SADT";
    let tfs = 10;
    doc.setFont(_font, "bold");
    doc.setFontSize(tfs);
    while (doc.getTextWidth(titleTxt) > TITLE_W - 4 && tfs > 5.5) {
      tfs -= 0.2;
      doc.setFontSize(tfs);
    }
    doc.setTextColor(...TEAL);
    const titleY = y + HDR_H / 2 + tfs * 0.18;
    doc.text(titleTxt, M + LOGO_W + TITLE_W / 2, titleY, { align: "center" });
  }

  // ── Campo 2 – Nº (à direita, centralizado verticalmente) ──
  {
    const f2x = M + LOGO_W + TITLE_W + 1;
    const field2 = { x: f2x, n: "2", value: "" };
    // label "2- Nº" grande, centralizado verticalmente com o título
    doc.setFont(_font, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEAL);
    const f2Y = y + HDR_H / 2 + 11 * 0.18; // centralizado verticalmente
    doc.text("2- Nº", f2x, f2Y);
    // Valor do campo 2 - ao lado do "2- Nº", mais à direita
    if (field2.value) {
      doc.setFontSize(8);
      doc.setFont(_font, "normal");
      const labelWidth = doc.getTextWidth("2- Nº");
      doc.text(field2.value, f2x + labelWidth + 4, f2Y); // aumentado espaçamento de 2 para 4
    }
  }

  y += HDR_H;

  // ===================================================================
  // ROW: 1 | 3 | 4 | 5 | 6 | 7
  // 50 + 97 + 40 + 30 + 40 + 30 = 287
  // ===================================================================
  {
    const cols = [
      { n: "1", l: "Registro ANS",            w: 50,  value: "" },
      { n: "3", l: "Nº Guia de Solicitação",  w: 97,  value: "" },
      { n: "4", l: "Data da Autorização",      w: 40,  value: "" },
      { n: "5", l: "Senha",                   w: 30,  value: "" },
      { n: "6", l: "Data Validade da Senha",  w: 40,  value: "" },
      { n: "7", l: "Data de Emissão da Guia", w: 30,  value: data.dataEmissao },
    ];
    let cx = M;
    for (const c of cols) {
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.n === "1") {
        dbox(doc, cx + 1, y + 4.2, "XXXXXXX");
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XXXXXXX", c.value);
      }
      if (c.n === "3") {
        dbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXXX", 2.4);
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXXX", c.value, 2.4);
      }
      if (c.n === "4" || c.n === "6" || c.n === "7") {
        dbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX");
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX", c.value);
      }
      if (c.n === "5") {
        dbox(doc, cx + 1, y + 4.2, "XXXXXXXX");
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XXXXXXXX", c.value);
      }
      cx += c.w;
    }
    y += RH;
  }

  // ===================================================================
  // DADOS DO BENEFICIÁRIO
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados do Beneficiário");
  {
    // 8 | 9 | 10 | 11 | 12 → 70+25+35+90+67 = 287
    const cols = [
      { n: "8",  l: "Número da Carteira",              w: 70, value: data.numeroCarteirinha || "" },
      { n: "9",  l: "Plano",                           w: 25, value: "" },
      { n: "10", l: "Validade da Carteira",            w: 35, value: "" },
      { n: "11", l: "Nome",                            w: 90, value: data.pacienteNome },
      { n: "12", l: "Número do Cartão Nacional de Saúde", w: 67, value: data.pacienteCns || "" },
    ];
    let cx = M;
    for (const c of cols) {
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.n === "10") {
        dbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX");
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX", c.value);
      }
      if (c.n === "12") {
        dbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXX", 2.4);
        if (c.value) fillDbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXX", c.value, 2.4);
      }
      // Campos sem caixinhas (8, 9, 11) - usar renderFieldValue
      if (c.n === "8" || c.n === "9" || c.n === "11") {
        if (c.value) {
          renderFieldValue(doc, c.value, cx, y, c.w);
        }
      }
      cx += c.w;
    }
    y += RH;
  }

  // ===================================================================
  // DADOS DO CONTRATADO SOLICITANTE
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados do Contratado Solicitante");
  {
    // Row 1: 13 | 14 | 15 → 100+148+39 = 287
    const r1 = [
      { n: "13", l: "Código na Operadora / CNPJ / CPF", w: 100, value: data.clinicaCnpj },
      { n: "14", l: "Nome do Contratado",               w: 148, value: data.clinicaNome },
      { n: "15", l: "Código CNES",                      w: 39,  value: data.clinicaCodigoCnes || "" },
    ];
    let cx = M;
    for (const c of r1) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;

    // Row 2: 16 | 17 | 18 | 19 | 20 → 147+40+55+15+30 = 287
    // Extrair apenas o número do CRM (remove prefixo "CRM/XX " se houver)
    const crmNumero = data.medicoCrm.replace(/^CRM\/?[A-Z]{0,2}\s*/i, "").trim() || data.medicoCrm;
    const r2 = [
      { n: "16", l: "Nome do Profissional  Solicitante", w: 147, value: data.medicoNome },
      { n: "17", l: "Conselho Profissional",             w: 40,  value: "CRM" },
      { n: "18", l: "Número no Conselho",                w: 55,  value: crmNumero },
      { n: "19", l: "UF",                               w: 15,  value: data.medicoUf || "" },
      { n: "20", l: "Código CBO-S",                     w: 30,  value: data.medicoCodigoCbo || "" },
    ];
    cx = M;
    for (const c of r2) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;
  }

  // ===================================================================
  // DADOS DA SOLICITAÇÃO / PROCEDIMENTOS E EXAMES SOLICITADOS
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados da Solicitação / Procedimentos e Exames Solicitados");
  {
    const R1H = 6;
    // Row: 21 | 22 | 23 | 24 → 52+65+35+135 = 287
    const f21x = M,       f21w = 52;
    const f22x = M + 52,  f22w = 65;
    const f23x = M + 117, f23w = 35;
    const f24x = M + 152, f24w = 135;

    // Formatar data/hora atual da solicitação
    const now = new Date();
    const dataSolicitacao = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const field21_24 = [
      { x: f21x, w: f21w, n: "21", l: "Data/Hora da Solicitação", value: dataSolicitacao },
      { x: f22x, w: f22w, n: "22", l: "Caráter da Solicitação", value: "" },
      { x: f23x, w: f23w, n: "23", l: "CID 10", value: data.cidCodigo || "" },
      { x: f24x, w: f24w, n: "24", l: "Indicação Clínica (obrigatório se pequena cirurgia, terapia, consulta de referência e alto custo)", value: data.indicacaoClinica || "" },
    ];

    // Desenhar campos (sem valores ainda)
    for (const f of field21_24) {
      fc(doc, f.x, y, f.w, R1H, f.n, f.l);
    }

    // Campo 21 - Data/Hora (apenas dbox, sem renderFieldValue)
    dbox(doc, f21x + 1, y + 3.5, "XX/XX/XXXX XX:XX", 2.4, 2.0);
    const field21Value = field21_24.find(f => f.n === "21")?.value;
    if (field21Value) {
      fillDbox(doc, f21x + 1, y + 3.5, "XX/XX/XXXX XX:XX", field21Value, 2.4, 2.0);
    }

    // Campo 22 – checkboxes E / U
    const cbY = y + 5.2;
    const checkboxSize = 2.6;
    const checkboxX1 = f22x + 2;
    cbox(doc, checkboxX1, cbY, checkboxSize);
    tealText(doc, "E - Eletiva",             f22x + 5.4,  cbY);
    cbox(doc, f22x + 33, cbY, checkboxSize);
    tealText(doc, "U - Urgência/Emergência", f22x + 36.4, cbY);
    // Marcar checkbox conforme prioridade
    if (prioridade === "urgencia") {
      markCheckbox(doc, f22x + 33, cbY, checkboxSize);
    } else {
      markCheckbox(doc, checkboxX1, cbY, checkboxSize);
    }

    // Campo 23 - CID 10
    const field23Value = field21_24.find(f => f.n === "23")?.value;
    if (field23Value) {
      renderFieldValue(doc, field23Value, f23x, y, f23w, 4);
    }

    // Campo 24 - Indicação Clínica
    const field24Value = field21_24.find(f => f.n === "24")?.value;
    if (field24Value) {
      renderFieldValue(doc, field24Value, f24x, y, f24w, 4);
    }

    y += R1H;

    // Tabela de procedimentos solicitados: 25 | 26 | 27 | 28 | 29
    // 20+55+155+28+29 = 287
    const pCols = [
      { n: "25", l: "Tabela",                  w: 20  },
      { n: "26", l: "Código do Procedimento",  w: 55  },
      { n: "27", l: "Descrição",               w: 155 },
      { n: "28", l: "Qt.Solic.",               w: 28  },
      { n: "29", l: "Qt.Autoriz.",             w: 29  },
    ];
    let cx = M;
    for (const c of pCols) { fc(doc, cx, y, c.w, THH, c.n, c.l); cx += c.w; }
    y += THH;

    for (let r = 0; r < 5; r++) {
      const exame = examesSolicitados[r];
      cx = M;
      for (const c of pCols) {
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, c.w, TH, "FD");
        if (c.n === "25") {
          tealText(doc, String(r + 1), cx + 0.8, y + 2.5, 4);
          dbox(doc, cx + 3.5, y + 1.0, "XXXX", 2.0, 2.0);
          if (exame?.codigoTuss) {
            fillDbox(doc, cx + 3.5, y + 1.0, "XXXX", "22", 2.0, 2.0); // Tabela 22 = TUSS
          }
        }
        if (c.n === "26") {
          dbox(doc, cx + 1, y + 1.0, "XXXXXXXX", 2.0, 2.0);
          if (exame?.codigoTuss) {
            fillDbox(doc, cx + 1, y + 1.0, "XXXXXXXX", exame.codigoTuss, 2.0, 2.0);
          }
        }
        if (c.n === "27" && exame) {
          doc.setFontSize(5);
          doc.setFont(_font, "normal");
          doc.setTextColor(...TEAL);
          doc.text(exame.nome, cx + 1, y + 3, { maxWidth: c.w - 2 });
        }
        if (c.n === "28") {
          dbox(doc, cx + 1, y + 1.0, "XXXX", 2.0, 2.0);
          if (exame) {
            fillDbox(doc, cx + 1, y + 1.0, "XXXX", String(exame.quantidade ?? 1), 2.0, 2.0);
          }
        }
        if (c.n === "29") {
          dbox(doc, cx + 1, y + 1.0, "XXXX", 2.0, 2.0);
        }
        cx += c.w;
      }
      y += TH;
    }
  }

  // ===================================================================
  // DADOS DO CONTRATADO EXECUTANTE
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados do Contratado Executante");
  {
    // Row 1: 30 | 31 | 32 → 100+158+29 = 287
    const r1 = [
      { n: "30", l: "Código na Operadora / CNPJ / CPF", w: 100, value: "" },
      { n: "31", l: "Nome do Contratado",               w: 158, value: "" },
      { n: "32", l: "T.L.",                             w: 29,  value: "" },
    ];
    let cx = M;
    for (const c of r1) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;

    // Row 2: 33-34-35 | 36 | 37 | 38 | 39 | 40 → 120+60+17+30+30+30 = 287
    const r2 = [
      { n: "33-34-35", l: "Logradouro - Número - Complemento", w: 120, value: "" },
      { n: "36",       l: "Município",                         w: 60,  value: "" },
      { n: "37",       l: "UF",                               w: 17,  value: "" },
      { n: "38",       l: "Cód. IBGE",                        w: 30,  value: "" },
      { n: "39",       l: "CEP",                              w: 30,  value: "" },
      { n: "40",       l: "Código CNES",                      w: 30,  value: "" },
    ];
    cx = M;
    for (const c of r2) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;

    // Row 3: 40a | 41 → 100+187 = 287
    const r3 = [
      { n: "40a", l: "Código na Operadora / CPF do exec. complementar", w: 100, value: "" },
      { n: "41",  l: "Nome do Profissional  Executante/Complementar",   w: 187, value: "" },
    ];
    cx = M;
    for (const c of r3) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;

    // Row 4: 42 | 43 | 44 | 45 | 45a → 55+77+17+70+68 = 287
    const r4 = [
      { n: "42",  l: "Conselho Profissional",  w: 55, value: "" },
      { n: "43",  l: "Número no Conselho",     w: 77, value: "" },
      { n: "44",  l: "UF",                    w: 17, value: "" },
      { n: "45",  l: "Código CBO S",          w: 70, value: "" },
      { n: "45a", l: "Grau de Participação",  w: 68, value: "" },
    ];
    cx = M;
    for (const c of r4) { 
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.value) {
        renderFieldValue(doc, c.value, cx, y, c.w);
      }
      cx += c.w;
    }
    y += RH;
  }

  // ===================================================================
  // DADOS DO ATENDIMENTO
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados do Atendimento");
  {
    const ATH = 8;
    // 46 | 47 | 48 → 165+65+57 = 287
    const f46w = 165, f47w = 65, f47x = M + 165, f48w = 57, f48x = M + 230;

    fc(doc, M,    y, f46w, ATH, "46", "Tipo Atendimento");
    fc(doc, f47x, y, f47w, ATH, "47", "Indicação de Acidente");
    fc(doc, f48x, y, f48w, ATH, "48", "Tipo de Saída");

    // Campo 46 – campo UU à esquerda + legendas à direita na mesma linha
    const field46Value = ""; // preenchido pelo executante
    
    // Campo de entrada UU à esquerda
    const uuX = M + 1;
    const uuY = y + 3.8; // deslocado para baixo
    dbox(doc, uuX, uuY, "UU", 2.4, 2.0);
    if (field46Value) {
      fillDbox(doc, uuX, uuY, "UU", field46Value, 2.4, 2.0);
    }

    // Legendas das opções à direita do UU (sem checkboxes)
    const op46a = [
      "01-Remoção", "02-Pequena Cirurgia", "03-Terapias",
      "04-Consulta", "05-Exame",
    ];
    const op46b = [
      "06-Atend. Domiciliar", "07-SADT Internado", "08-Quimioterapia",
      "09-Radioterapia", "10-TRS-Ter. Renal Sub.",
    ];

    doc.setFontSize(3.8);
    doc.setFont(_font, "normal");
    doc.setTextColor(...TEAL);

    // Legendas à direita do UU, deslocadas para baixo
    const legendStartX = uuX + 2 * 2.4 + 2; // após o campo UU
    const row1Y = y + 4.7; // legendas deslocadas para baixo
    const row2Y = y + 6.5; // segunda linha de legendas (deslocada para baixo)
    
    let tx = legendStartX;
    for (const op of op46a) {
      tealText(doc, op, tx, row1Y, 3.8);
      tx += doc.getTextWidth(op) + 2;
    }
    tx = legendStartX;
    for (const op of op46b) {
      tealText(doc, op, tx, row2Y, 3.8);
      tx += doc.getTextWidth(op) + 2;
    }

    // Campo 47 – Indicação de Acidente (campo U à esquerda + legendas à direita na mesma linha)
    const field47Value = ""; // preenchido pelo executante
    
    // Campo de entrada U à esquerda
    const uu47X = f47x + 1;
    const uu47Y = y + 3.5; // deslocado para baixo
    dbox(doc, uu47X, uu47Y, "U", 2.4, 2.0); // apenas 1 dígito
    if (field47Value) {
      fillDbox(doc, uu47X, uu47Y, "U", field47Value, 2.4, 2.0);
    }

    // Legendas das opções à direita do U (sem checkboxes)
    const op47 = [
      "0-Acid./Doença Trabalho",
      "1-Trânsito",
      "2-Outros",
      "9-Ignorado",
    ];

    doc.setFontSize(3.8);
    doc.setFont(_font, "normal");
    doc.setTextColor(...TEAL);

    // Legendas à direita do U, deslocadas para baixo
    const legend47StartX = uu47X + 2.4 + 2; // após o campo U
    const legend47Y = y + 5.2; // legendas deslocadas para baixo
    let tx47 = legend47StartX;
    for (const op of op47) {
      tealText(doc, op, tx47, legend47Y, 3.8);
      tx47 += doc.getTextWidth(op) + 2;
    }

    // Campo 48 – Tipo de Saída (campo U à esquerda + legendas à direita na mesma linha)
    const field48Value = ""; // preenchido pelo executante
    
    // Campo de entrada U à esquerda
    const uu48X = f48x + 1;
    const uu48Y = y + 3.5; // deslocado para baixo
    dbox(doc, uu48X, uu48Y, "U", 2.4, 2.0); // apenas 1 dígito
    if (field48Value) {
      fillDbox(doc, uu48X, uu48Y, "U", field48Value, 2.4, 2.0);
    }

    // Legendas das opções à direita do U (sem checkboxes)
    const op48a = ["1-Retorno", "2-Ret. SADT", "3-Referência"];
    const op48b = ["4-Internação", "5-Alta", "6-Óbito"];

    doc.setFontSize(3.8);
    doc.setFont(_font, "normal");
    doc.setTextColor(...TEAL);

    // Legendas à direita do U, deslocadas para baixo
    const legend48StartX = uu48X + 2.4 + 2; // após o campo U
    const legend48Row1Y = y + 5.2; // legendas deslocadas para baixo
    const legend48Row2Y = y + 6.5; // segunda linha de legendas (deslocada para baixo)
    
    let tx48 = legend48StartX;
    for (const op of op48a) {
      tealText(doc, op, tx48, legend48Row1Y, 3.8);
      tx48 += doc.getTextWidth(op) + 2;
    }
    tx48 = legend48StartX;
    for (const op of op48b) {
      tealText(doc, op, tx48, legend48Row2Y, 3.8);
      tx48 += doc.getTextWidth(op) + 2;
    }

    y += ATH;
  }

  // ===================================================================
  // CONSULTA REFERÊNCIA
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Consulta Referência");
  {
    const RFH = 6;
    // 49 | 50 → 100+187 = 287
    const field49_50 = [
      { x: M, w: 100, n: "49", l: "Tipo de Doença", value: "" },
      { x: M + 100, w: 187, n: "50", l: "Tempo de Doença", value: "" },
    ];

    for (const f of field49_50) {
      fc(doc, f.x, y, f.w, RFH, f.n, f.l);
    }

    // Campo 49 — cbox e texto no mesmo Y
    const cb49Y = y + 5.2;
    cbox(doc, M + 1,  cb49Y); tealText(doc, "A - Aguda",   M + 4.2,  cb49Y, 4.2);
    cbox(doc, M + 24, cb49Y); tealText(doc, "C - Crônica", M + 27.2, cb49Y, 4.2);
    // Não marcar — preenchido manualmente

    // Campo 50 — dbox e texto alinhados verticalmente
    const f50Y = y + 5.2;
    let tx = M + 101;
    const tempoData = { L: "", A: "", M: "", D: "" };
    for (const [prefix, label] of [["L", ""], ["A", "Anos"], ["M", "Meses"], ["D", "Dias"]]) {
      const prefixTxt = label ? `${prefix} - ${label}` : `${prefix} -`;
      tealText(doc, prefixTxt, tx, f50Y, 4.2);
      tx += doc.getTextWidth(prefixTxt) + 1;
      dbox(doc, tx, f50Y - 2.0, "XX", 2.4, 2.0);
      const tempoValor = tempoData[prefix as keyof typeof tempoData] || "";
      if (tempoValor) {
        fillDbox(doc, tx, f50Y - 2.0, "XX", tempoValor, 2.4, 2.0);
      }
      tx += 2 * 2.4 + 4;
    }

    y += RFH;
  }

  // ===================================================================
  // PROCEDIMENTOS E EXAMES REALIZADOS
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Procedimentos e Exames realizados");
  {
    // 51|52|53|54|55|56|57|58|59|60|61|62
    // 30+18+18+15+38+65+14+10+10+22+23+24 = 287
    const pCols = [
      { n: "51", l: "Data",                  w: 30 },
      { n: "52", l: "Hora Inicial",          w: 18 },
      { n: "53", l: "Hora Final",            w: 18 },
      { n: "54", l: "Tabela",               w: 15 },
      { n: "55", l: "Código do Procedimento", w: 38 },
      { n: "56", l: "Descrição",            w: 65 },
      { n: "57", l: "Qtde.",               w: 14 },
      { n: "58", l: "Via",                 w: 10 },
      { n: "59", l: "Tec.",                w: 10 },
      { n: "60", l: "% Red./Acresc.",      w: 22 },
      { n: "61", l: "Valor Unitário - R$", w: 23 },
      { n: "62", l: "Valor Total - R$",   w: 24 },
    ];
    let cx = M;
    for (const c of pCols) { fc(doc, cx, y, c.w, THH, c.n, c.l); cx += c.w; }
    y += THH;

    // Seção preenchida pelo executante (laboratório) — todas as linhas vazias
    const emptyProc: Record<string, string> = { data: "", horaIni: "", horaFim: "", tabela: "", codigo: "", descricao: "", qtde: "", via: "", tec: "", redAcresc: "", valorUnit: "", valorTotal: "" };
    const procedimentosRealizadosData = [emptyProc, emptyProc, emptyProc, emptyProc, emptyProc];

    for (let r = 0; r < 5; r++) {
      const procData = procedimentosRealizadosData[r] || {};
      cx = M;
      for (const c of pCols) {
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, c.w, TH, "FD");
        if (c.n === "51") {
          tealText(doc, String(r + 1), cx + 0.6, y + 2.5, 3.8);
          dbox(doc, cx + 3.5, y + 1.0, "XX/XX/XXXX", 1.8, 2.0);
          if (procData.data) {
            fillDbox(doc, cx + 3.5, y + 1.0, "XX/XX/XXXX", procData.data, 1.8, 2.0);
          }
        }
        if (c.n === "52") {
          dbox(doc, cx + 0.8, y + 1.0, "XX:XX", 1.8, 2.0);
          if (procData.horaIni) {
            fillDbox(doc, cx + 0.8, y + 1.0, "XX:XX", procData.horaIni, 1.8, 2.0);
          }
        }
        if (c.n === "53") {
          dbox(doc, cx + 0.8, y + 1.0, "XX:XX", 1.8, 2.0);
          if (procData.horaFim) {
            fillDbox(doc, cx + 0.8, y + 1.0, "XX:XX", procData.horaFim, 1.8, 2.0);
          }
        }
        if (c.n === "54" && procData.tabela) {
          renderFieldValue(doc, procData.tabela, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "55" && procData.codigo) {
          renderFieldValue(doc, procData.codigo, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "56" && procData.descricao) {
          renderFieldValue(doc, procData.descricao, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "57" && procData.qtde) {
          renderFieldValue(doc, procData.qtde, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "58" && procData.via) {
          renderFieldValue(doc, procData.via, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "59" && procData.tec) {
          renderFieldValue(doc, procData.tec, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "60" && procData.redAcresc) {
          renderFieldValue(doc, procData.redAcresc, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "61" && procData.valorUnit) {
          renderFieldValue(doc, procData.valorUnit, cx, y - 1, c.w, 3.5);
        }
        if (c.n === "62" && procData.valorTotal) {
          renderFieldValue(doc, procData.valorTotal, cx, y - 1, c.w, 3.5);
        }
        cx += c.w;
      }
      y += TH;
    }
  }

  // ===================================================================
  // CAMPO 63 – Data e Assinatura de Procedimentos em Série
  // ===================================================================
  {
    const F63H = 10;
    fc(doc, M, y, CW, F63H, "63", "Data e Assinatura de Procedimentos em Série");

    // Preenchido pelo executante
    const field63Data = ["", "", "", "", "", "", "", "", "", ""];

    const slotW = CW / 10;
    for (let i = 0; i < 10; i++) {
      const sx = M + i * slotW;
      const dataValue = field63Data[i] || "";
      tealText(doc, String(i + 1), sx + 0.6, y + 3.2, 3.8);
      dbox(doc, sx + 3.5, y + 4.5, "XX/XX/XX", 2.0, 2.0);
      if (dataValue) {
        fillDbox(doc, sx + 3.5, y + 4.5, "XX/XX/XX", dataValue, 2.0, 2.0);
      }
      // linha de assinatura
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.15);
      doc.line(sx + 1, y + F63H - 0.8, sx + slotW - 1, y + F63H - 0.8);
      // separador vertical entre slots (exceto o último)
      if (i < 9) {
        doc.setLineWidth(0.12);
        doc.line(sx + slotW, y + 1, sx + slotW, y + F63H);
      }
    }
    y += F63H;
  }

  // ===================================================================
  // CAMPO 64 – Observação
  // ===================================================================
  {
    const F64H = 5;
    const justificativasParts = examesSolicitados
      .filter((e) => e.justificativa)
      .map((e) => `${e.nome}: ${e.justificativa}`);
    const obs64 = justificativasParts.length > 0
      ? justificativasParts.join(" | ")
      : "Paciente compareceu ao atendimento conforme agendado.";
    const field64 = { x: M, w: CW, n: "64", l: "Observação", value: obs64 };
    fc(doc, field64.x, y, field64.w, F64H, field64.n, field64.l);
    if (field64.value) {
      renderFieldValue(doc, field64.value, field64.x, y, field64.w, 4);
    }
    y += F64H;
  }

  // ===================================================================
  // TOTAIS
  // ===================================================================
  {
    const TOTH = 7;
    // 7 colunas iguais: 287 / 7 = 41 mm
    const totCols = [
      { n: "65", l: "Total Procedimentos R$",    w: 41, value: "" },
      { n: "66", l: "Total Taxas e Aluguéis R$", w: 41, value: "" },
      { n: "67", l: "Total  Materiais R$",        w: 41, value: "" },
      { n: "68", l: "Total Medicamentos R$",      w: 41, value: "" },
      { n: "69", l: "Total Diárias R$",           w: 41, value: "" },
      { n: "70", l: "Total  Gases Medicinais R$", w: 41, value: "" },
      { n: "71", l: "Total Geral da Guia R$",     w: 41, value: "" },
    ];
    let cx = M;
    for (const c of totCols) {
      fc(doc, cx, y, c.w, TOTH, c.n, c.l);
      dbox(doc, cx + 1, y + 4.5, "XXXXXXXX", 2.5, 2.0);
      if (c.value) {
        fillDbox(doc, cx + 1, y + 4.5, "XXXXXXXX", c.value, 2.5, 2.0);
      }
      cx += c.w;
    }
    y += TOTH;
  }

  // ===================================================================
  // ASSINATURAS (espaço restante)
  // ===================================================================
  {
    const sigH = H - M - y; // altura disponível até a margem inferior
    // 86 | 87 | 88 | 89 → 71+72+72+72 = 287
    const sigCols = [
      { n: "86", l: "Data e Assinatura do Solicitante",                  w: 71, value: "" },
      { n: "87", l: "Data e Assinatura do Responsável pela Autorização", w: 72, value: "" },
      { n: "88", l: "Data e Assinatura do Beneficiário  ou Responsável", w: 72, value: "" },
      { n: "89", l: "Data e Assinatura do Prestador Executante",         w: 72, value: "" },
    ];
    let cx = M;
    for (const c of sigCols) {
      fc(doc, cx, y, c.w, sigH, c.n, c.l);
      dbox(doc, cx + 1, y + 4.5, "XX/XX/XXXX", 2.5, 2.0);
      if (c.value) {
        fillDbox(doc, cx + 1, y + 4.5, "XX/XX/XXXX", c.value, 2.5, 2.0);
      }
      cx += c.w;
    }
  }

  return doc.output("arraybuffer");
}
