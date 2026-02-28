import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawFooterSignature,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface FichaAtendimentoData extends BaseDocumentData {
  dataConsulta: string;
  horaConsulta?: string;
  anamnese?: string;
  cidCodes?: Array<{ code: string; description: string }>;
  exames?: Array<{ nome: string; tipo: string }>;
  protocolos?: Array<{ nome: string; descricao?: string }>;
  prescricoes?: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
  atestados?: Array<{ nome: string }>;
}

// =====================================================
// HELPERS INTERNOS
// =====================================================

/** Converte anamnese (JSON ou texto livre) em lista de seções { title, content } */
function parseAnamneseSections(anamnese: string): Array<{ title: string; content: string }> {
  const trimmed = anamnese.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      return Object.entries(parsed)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => ({ title: k, content: v }));
    } catch {
      // fall through to text parsing
    }
  }
  // Formato texto: blocos separados por linha em branco ou linhas ALL-CAPS como título
  const lines = trimmed.split("\n");
  const sections: Array<{ title: string; content: string }> = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (currentTitle || content) sections.push({ title: currentTitle, content });
  };

  for (const raw of lines) {
    const line = raw.trim();
    const isTitle =
      line.length > 0 &&
      line.length < 80 &&
      line === line.toUpperCase() &&
      /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜÑ\s\-\/0-9]+$/.test(line) &&
      !line.endsWith(":");

    const isTitleColon = (() => {
      const idx = line.indexOf(":");
      if (idx < 1) return false;
      const before = line.slice(0, idx).trim();
      return (
        before.length < 80 &&
        before === before.toUpperCase() &&
        /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇÜÑ\s\-\/0-9]+$/.test(before)
      );
    })();

    if (isTitle) {
      flush();
      currentTitle = line;
      currentLines = [];
    } else if (isTitleColon) {
      flush();
      const idx = line.indexOf(":");
      currentTitle = line.slice(0, idx).trim();
      currentLines = [line.slice(idx + 1).trim()].filter(Boolean);
    } else {
      currentLines.push(raw);
    }
  }
  flush();
  return sections.length ? sections : [{ title: "", content: trimmed }];
}

const PAGE_HEIGHT = 297; // A4 mm
const FOOTER_RESERVE = 28; // espaço reservado para rodapé

function checkPageBreak(doc: ReturnType<typeof createDoc>, y: number, needed = 10): number {
  if (y + needed > PAGE_HEIGHT - FOOTER_RESERVE) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawSectionTitle(
  doc: ReturnType<typeof createDoc>,
  title: string,
  y: number,
  fontSize = 10,
): number {
  y = checkPageBreak(doc, y, 14);
  doc.setFontSize(fontSize);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, MARGIN, y);
  return y + 6;
}

function drawSubsectionTitle(
  doc: ReturnType<typeof createDoc>,
  title: string,
  y: number,
): number {
  y = checkPageBreak(doc, y, 10);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(title.toUpperCase(), MARGIN + 2, y);
  return y + 5;
}

// =====================================================
// FICHA DE ATENDIMENTO
// =====================================================
export function generateFichaAtendimentoPDF(data: FichaAtendimentoData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;

  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);

  // ── Título ──
  doc.setFontSize(14);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("FICHA DE ATENDIMENTO", MARGIN, y);
  y += 6;

  // ── Data e Hora ──
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  let dataHoraTexto = `Data: ${data.dataConsulta}`;
  if (data.horaConsulta) dataHoraTexto += ` | Hora: ${data.horaConsulta}`;
  doc.text(dataHoraTexto, MARGIN, y);
  y += 8;

  // =====================================================
  // SEÇÃO 1: ANAMNESE
  // =====================================================
  if (data.anamnese) {
    y = drawSectionTitle(doc, "ANAMNESE", y);

    const anamneseSections = parseAnamneseSections(data.anamnese);

    for (const section of anamneseSections) {
      // Sub-título da seção (ex: "QUEIXA PRINCIPAL")
      if (section.title) {
        y = checkPageBreak(doc, y, 8);
        doc.setFontSize(8);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate600);
        doc.text(section.title, MARGIN + 2, y);
        y += 5;
      }
      // Conteúdo
      if (section.content) {
        doc.setFontSize(9);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        const wrapped = doc.splitTextToSize(section.content, CONTENT_WIDTH - 4);
        for (const line of wrapped) {
          y = checkPageBreak(doc, y, 5);
          doc.text(line, MARGIN + 2, y);
          y += 5;
        }
      }
      y += 3;
    }
    y += 2;
  }

  // =====================================================
  // SEÇÃO 2: HIPÓTESE DIAGNÓSTICO E CID
  // =====================================================
  if (data.cidCodes && data.cidCodes.length > 0) {
    y = drawSectionTitle(doc, "HIPÓTESE DIAGNÓSTICO E CID", y);

    doc.setFontSize(9);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);

    for (const cid of data.cidCodes) {
      y = checkPageBreak(doc, y, 5);
      doc.text(`• ${cid.code} — ${cid.description}`, MARGIN + 4, y);
      y += 5;
    }
    y += 4;
  }

  // =====================================================
  // SEÇÃO 3: CONDUTA
  // =====================================================
  const hasExames = data.exames && data.exames.length > 0;
  const hasPrescricoes = data.prescricoes && data.prescricoes.length > 0;
  const hasAtestados = data.atestados && data.atestados.length > 0;
  const hasConduta = hasExames || hasPrescricoes || hasAtestados;

  if (hasConduta) {
    y = drawSectionTitle(doc, "CONDUTA", y);

    // ── Exames ──
    if (hasExames) {
      y = drawSubsectionTitle(doc, "Exames", y);
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const exame of data.exames!) {
        y = checkPageBreak(doc, y, 5);
        const exameText = exame.tipo ? `${exame.nome} (${exame.tipo})` : exame.nome;
        doc.text(`• ${exameText}`, MARGIN + 4, y);
        y += 5;
      }
      y += 5;
    }

    // ── Prescrições ──
    if (hasPrescricoes) {
      y = drawSubsectionTitle(doc, "Prescrições", y);
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      data.prescricoes!.forEach((presc, index) => {
        y = checkPageBreak(doc, y, 10);
        // Linha 1: número + medicamento + dosagem
        let linha1 = `${index + 1}. ${presc.medicamento}`;
        if (presc.dosagem) linha1 += ` ${presc.dosagem}`;
        doc.setFont(PDF_FONT, "bold");
        doc.text(linha1, MARGIN + 4, y);
        y += 5;

        // Linha 2: posologia + duração
        if (presc.posologia || presc.duracao) {
          doc.setFont(PDF_FONT, "normal");
          doc.setTextColor(...COLORS.slate600);
          const linha2Parts: string[] = [];
          if (presc.posologia) linha2Parts.push(presc.posologia);
          if (presc.duracao) linha2Parts.push(presc.duracao);
          const linha2 = linha2Parts.join(" — ");
          const linhaWrapped = doc.splitTextToSize(linha2, CONTENT_WIDTH - 12);
          for (const l of linhaWrapped) {
            y = checkPageBreak(doc, y, 5);
            doc.text(l, MARGIN + 8, y);
            y += 5;
          }
          doc.setTextColor(...COLORS.slate800);
        }
        y += 2;
      });
      y += 3;
    }

    // ── Atestados e Declarações ──
    if (hasAtestados) {
      y = drawSubsectionTitle(doc, "Atestados e Declarações", y);
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const atestado of data.atestados!) {
        y = checkPageBreak(doc, y, 5);
        doc.text(`• ${atestado.nome}`, MARGIN + 4, y);
        y += 5;
      }
      y += 4;
    }
  }

  // ── Assinatura (sem traço e sem data, alinhada no bottom) ──
  drawFooterSignature(doc, data, undefined, { hideDateLine: true });
  return doc.output("arraybuffer");
}
