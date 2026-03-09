import jsPDF from "jspdf";
import { getInterFonts } from "./load-inter-font";
import { BaseDocumentData } from "./pdf-base";

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

/** Texto inline em teal pequeno */
function tealText(doc: jsPDF, text: string, x: number, y: number, size = 4.2): void {
  doc.setFontSize(size);
  doc.setFont(_font, "normal");
  doc.setTextColor(...TEAL);
  doc.text(text, x, y);
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
export function generateGuiaConsultaTISSPDF(_data: BaseDocumentData, logoBase64?: string): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  initFont(doc);

  let y = M;

  // ===================================================================
  // CABEÇALHO: Logo | Título | 2-Nº
  // ===================================================================
  const HDR_H = 10;
  const LOGO_W  = 42;
  const F2_W    = 48;
  const TITLE_W = CW - LOGO_W - F2_W; // ~197 mm

  // borda geral
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CW, HDR_H, "S");

  // separadores verticais
  doc.line(M + LOGO_W,            y, M + LOGO_W,            y + HDR_H);
  doc.line(M + LOGO_W + TITLE_W,  y, M + LOGO_W + TITLE_W,  y + HDR_H);

  // ── Logo ──
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", M + 1, y + 0.5, LOGO_W - 2, HDR_H - 1);
  } else {
    drawIamspe(doc, M + 1, y + 0.5, LOGO_W - 2, HDR_H - 1);
  }

  // ── Título centralizado ──
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
    doc.text(titleTxt, M + LOGO_W + TITLE_W / 2, y + HDR_H / 2 + tfs * 0.18, { align: "center" });
  }

  // ── Campo 2 – Nº (célula própria à direita) ──
  {
    const f2x = M + LOGO_W + TITLE_W + 1;
    // label "2- Nº" grande
    doc.setFont(_font, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text("2- Nº", f2x, y + 4.5);
    // caixinhas alinhadas ao centro-base
    dbox(doc, f2x, y + 5.5, "##########", 2.3, 2.0);
  }

  y += HDR_H;

  // ===================================================================
  // ROW: 1 | 3 | 4 | 5 | 6 | 7
  // 50 + 97 + 40 + 30 + 40 + 30 = 287
  // ===================================================================
  {
    const cols = [
      { n: "1", l: "Registro ANS",            w: 50  },
      { n: "3", l: "Nº Guia de Solicitação",  w: 97  },
      { n: "4", l: "Data da Autorização",      w: 40  },
      { n: "5", l: "Senha",                   w: 30  },
      { n: "6", l: "Data Validade da Senha",  w: 40  },
      { n: "7", l: "Data de Emissão da Guia", w: 30  },
    ];
    let cx = M;
    for (const c of cols) {
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.n === "1")  dbox(doc, cx + 1, y + 4.2, "XXXXXXX");
      if (c.n === "3")  dbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXXX", 2.4);
      if (c.n === "4" || c.n === "6" || c.n === "7")
                        dbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX");
      if (c.n === "5")  dbox(doc, cx + 1, y + 4.2, "XXXXXXXX");
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
      { n: "8",  l: "Número da Carteira",              w: 70 },
      { n: "9",  l: "Plano",                           w: 25 },
      { n: "10", l: "Validade da Carteira",            w: 35 },
      { n: "11", l: "Nome",                            w: 90 },
      { n: "12", l: "Número do Cartão Nacional de Saúde", w: 67 },
    ];
    let cx = M;
    for (const c of cols) {
      fc(doc, cx, y, c.w, RH, c.n, c.l);
      if (c.n === "10") dbox(doc, cx + 1, y + 4.2, "XX/XX/XXXX");
      if (c.n === "12") dbox(doc, cx + 1, y + 4.2, "XXXXXXXXXXXXXXX", 2.4);
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
      { n: "13", l: "Código na Operadora / CNPJ / CPF", w: 100 },
      { n: "14", l: "Nome do Contratado",               w: 148 },
      { n: "15", l: "Código CNES",                      w: 39  },
    ];
    let cx = M;
    for (const c of r1) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
    y += RH;

    // Row 2: 16 | 17 | 18 | 19 | 20 → 147+40+55+15+30 = 287
    const r2 = [
      { n: "16", l: "Nome do Profissional  Solicitante", w: 147 },
      { n: "17", l: "Conselho Profissional",             w: 40  },
      { n: "18", l: "Número no Conselho",                w: 55  },
      { n: "19", l: "UF",                               w: 15  },
      { n: "20", l: "Código CBO-S",                     w: 30  },
    ];
    cx = M;
    for (const c of r2) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
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

    fc(doc, f21x, y, f21w, R1H, "21", "Data/Hora da Solicitação");
    dbox(doc, f21x + 1, y + 3.5, "XX/XX/XXXX XX:XX", 2.4, 2.0);

    fc(doc, f22x, y, f22w, R1H, "22", "Caráter da Solicitação");
    // checkboxes E / U — cbox e texto no mesmo Y
    const cbY = y + 5.2;
    cbox(doc, f22x + 2,  cbY);
    tealText(doc, "E - Eletiva",             f22x + 5.4,  cbY);
    cbox(doc, f22x + 33, cbY);
    tealText(doc, "U - Urgência/Emergência", f22x + 36.4, cbY);

    fc(doc, f23x, y, f23w, R1H, "23", "CID 10");
    fc(doc, f24x, y, f24w, R1H, "24",
       "Indicação Clínica (obrigatório se pequena cirurgia, terapia, consulta de referência e alto custo)");
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
      cx = M;
      for (const c of pCols) {
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, c.w, TH, "FD");
        if (c.n === "25") {
          tealText(doc, String(r + 1), cx + 0.8, y + 2.5, 4);
          dbox(doc, cx + 3.5, y + 1.0, "XXXX", 2.0, 2.0);
        }
        if (c.n === "26") dbox(doc, cx + 1,   y + 1.0, "XXXXXXXX",  2.0, 2.0);
        if (c.n === "28" || c.n === "29")
                          dbox(doc, cx + 1,   y + 1.0, "XXXX",      2.0, 2.0);
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
      { n: "30", l: "Código na Operadora / CNPJ / CPF", w: 100 },
      { n: "31", l: "Nome do Contratado",               w: 158 },
      { n: "32", l: "T.L.",                             w: 29  },
    ];
    let cx = M;
    for (const c of r1) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
    y += RH;

    // Row 2: 33-34-35 | 36 | 37 | 38 | 39 | 40 → 120+60+17+30+30+30 = 287
    const r2 = [
      { n: "33-34-35", l: "Logradouro - Número - Complemento", w: 120 },
      { n: "36",       l: "Município",                         w: 60  },
      { n: "37",       l: "UF",                               w: 17  },
      { n: "38",       l: "Cód. IBGE",                        w: 30  },
      { n: "39",       l: "CEP",                              w: 30  },
      { n: "40",       l: "Código CNES",                      w: 30  },
    ];
    cx = M;
    for (const c of r2) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
    y += RH;

    // Row 3: 40a | 41 → 100+187 = 287
    const r3 = [
      { n: "40a", l: "Código na Operadora / CPF do exec. complementar", w: 100 },
      { n: "41",  l: "Nome do Profissional  Executante/Complementar",   w: 187 },
    ];
    cx = M;
    for (const c of r3) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
    y += RH;

    // Row 4: 42 | 43 | 44 | 45 | 45a → 55+77+17+70+68 = 287
    const r4 = [
      { n: "42",  l: "Conselho Profissional",  w: 55 },
      { n: "43",  l: "Número no Conselho",     w: 77 },
      { n: "44",  l: "UF",                    w: 17 },
      { n: "45",  l: "Código CBO S",          w: 70 },
      { n: "45a", l: "Grau de Participação",  w: 68 },
    ];
    cx = M;
    for (const c of r4) { fc(doc, cx, y, c.w, RH, c.n, c.l); cx += c.w; }
    y += RH;
  }

  // ===================================================================
  // DADOS DO ATENDIMENTO
  // ===================================================================
  y = sh(doc, M, y, CW, SH, "Dados do Atendimento");
  {
    const ATH = 12;
    // 46 | 47 | 48 → 165+65+57 = 287
    const f46w = 165, f47w = 65, f47x = M + 165, f48w = 57, f48x = M + 230;

    fc(doc, M,    y, f46w, ATH, "46", "Tipo Atendimento");
    fc(doc, f47x, y, f47w, ATH, "47", "Indicação de Acidente");
    fc(doc, f48x, y, f48w, ATH, "48", "Tipo de Saída");

    // Campo 46 – opções em 2 linhas (cbox e texto no mesmo Y)
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
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.2);

    const row1Y = y + 6.0; // primeira linha de checkboxes
    const row2Y = y + 9.5; // segunda linha de checkboxes
    let tx = M + 1;
    for (const op of op46a) {
      cbox(doc, tx, row1Y);
      tealText(doc, op, tx + 3.2, row1Y, 3.8);
      tx += 3.2 + doc.getTextWidth(op) + 1.5;
    }
    tx = M + 1;
    for (const op of op46b) {
      cbox(doc, tx, row2Y);
      tealText(doc, op, tx + 3.2, row2Y, 3.8);
      tx += 3.2 + doc.getTextWidth(op) + 1.5;
    }

    // Campo 47 – Indicação de Acidente (cbox e texto alinhados)
    const ac1Y = y + 5.5;
    const ac2Y = y + 8.0;
    const ac3Y = y + 10.5;
    cbox(doc, f47x + 1, ac1Y);
    tealText(doc, "0-Acid./Doença Trabalho", f47x + 4.2, ac1Y, 3.8);
    cbox(doc, f47x + 1, ac2Y);
    tealText(doc, "1-Trânsito",              f47x + 4.2, ac2Y, 3.8);
    cbox(doc, f47x + 33, ac2Y);
    tealText(doc, "2-Outros",               f47x + 36.2, ac2Y, 3.8);
    cbox(doc, f47x + 1, ac3Y);
    tealText(doc, "9-Ignorado",              f47x + 4.2, ac3Y, 3.8);

    // Campo 48 – Tipo de Saída (em 2 colunas, cbox e texto alinhados)
    const op48a = ["1-Retorno", "2-Ret. SADT", "3-Referência"];
    const op48b = ["4-Internação", "5-Alta", "6-Óbito"];
    let sy = y + 5.5;
    for (const op of op48a) {
      cbox(doc, f48x + 1, sy);
      tealText(doc, op, f48x + 4.2, sy, 3.8);
      sy += 2.5;
    }
    sy = y + 5.5;
    for (const op of op48b) {
      cbox(doc, f48x + 29, sy);
      tealText(doc, op, f48x + 32.2, sy, 3.8);
      sy += 2.5;
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
    fc(doc, M,       y, 100, RFH, "49", "Tipo de Doença");
    fc(doc, M + 100, y, 187, RFH, "50", "Tempo de Doença");

    // Campo 49 — cbox e texto no mesmo Y
    const cb49Y = y + 5.2;
    cbox(doc, M + 1,  cb49Y); tealText(doc, "A - Aguda",   M + 4.2,  cb49Y, 4.2);
    cbox(doc, M + 24, cb49Y); tealText(doc, "C - Crônica", M + 27.2, cb49Y, 4.2);

    // Campo 50 — dbox e texto alinhados verticalmente
    const f50Y = y + 5.2;
    let tx = M + 101;
    for (const [prefix, label] of [["L", ""], ["A", "Anos"], ["M", "Meses"], ["D", "Dias"]]) {
      const prefixTxt = label ? `${prefix} - ${label}` : `${prefix} -`;
      tealText(doc, prefixTxt, tx, f50Y, 4.2);
      tx += doc.getTextWidth(prefixTxt) + 1;
      dbox(doc, tx, f50Y - 2.0, "XX", 2.4, 2.0);
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

    for (let r = 0; r < 5; r++) {
      cx = M;
      for (const c of pCols) {
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, c.w, TH, "FD");
        if (c.n === "51") {
          tealText(doc, String(r + 1), cx + 0.6, y + 2.5, 3.8);
          dbox(doc, cx + 3.5, y + 1.0, "XX/XX/XXXX", 1.8, 2.0);
        }
        if (c.n === "52" || c.n === "53")
          dbox(doc, cx + 0.8, y + 1.0, "XX:XX", 1.8, 2.0);
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

    const slotW = CW / 10;
    for (let i = 0; i < 10; i++) {
      const sx = M + i * slotW;
      tealText(doc, String(i + 1), sx + 0.6, y + 3.2, 3.8);
      dbox(doc, sx + 3.5, y + 4.5, "XX/XX/XX", 2.0, 2.0);
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
    fc(doc, M, y, CW, F64H, "64", "Observação");
    y += F64H;
  }

  // ===================================================================
  // TOTAIS
  // ===================================================================
  {
    const TOTH = 7;
    // 7 colunas iguais: 287 / 7 = 41 mm
    const totCols = [
      { n: "65", l: "Total Procedimentos R$",    w: 41 },
      { n: "66", l: "Total Taxas e Aluguéis R$", w: 41 },
      { n: "67", l: "Total  Materiais R$",        w: 41 },
      { n: "68", l: "Total Medicamentos R$",      w: 41 },
      { n: "69", l: "Total Diárias R$",           w: 41 },
      { n: "70", l: "Total  Gases Medicinais R$", w: 41 },
      { n: "71", l: "Total Geral da Guia R$",     w: 41 },
    ];
    let cx = M;
    for (const c of totCols) {
      fc(doc, cx, y, c.w, TOTH, c.n, c.l);
      dbox(doc, cx + 1, y + 4.5, "XXXXXXXX", 2.5, 2.0);
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
      { n: "86", l: "Data e Assinatura do Solicitante",                  w: 71 },
      { n: "87", l: "Data e Assinatura do Responsável pela Autorização", w: 72 },
      { n: "88", l: "Data e Assinatura do Beneficiário  ou Responsável", w: 72 },
      { n: "89", l: "Data e Assinatura do Prestador Executante",         w: 72 },
    ];
    let cx = M;
    for (const c of sigCols) {
      fc(doc, cx, y, c.w, sigH, c.n, c.l);
      dbox(doc, cx + 1, y + 4.5, "XX/XX/XXXX", 2.5, 2.0);
      cx += c.w;
    }
  }

  return doc.output("arraybuffer");
}
