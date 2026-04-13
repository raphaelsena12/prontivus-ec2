import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawFooterSignature, checkPageBreak,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface FichaAtendimentoData extends BaseDocumentData {
  fichaNumero?: string;
  dataConsulta: string;
  horaConsulta?: string;
  anamnese?: string;
  cidCodes?: Array<{ code: string; description: string }>;
  exames?: Array<{ nome: string; tipo: string }>;
  protocolos?: Array<{ nome: string; descricao?: string }>;
  prescricoes?: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
  orientacoes?: string;
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

function drawSectionTitle(
  doc: ReturnType<typeof createDoc>,
  title: string,
  y: number,
  fontSize = 8.5,
): number {
  y = checkPageBreak(doc, y, 12);
  doc.setFontSize(fontSize);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(title, MARGIN, y);
  return y + 5;
}

function drawSubsectionTitle(
  doc: ReturnType<typeof createDoc>,
  title: string,
  y: number,
): number {
  y = checkPageBreak(doc, y, 8);
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text(title.toUpperCase(), MARGIN + 2, y);
  return y + 4;
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
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("FICHA DE ATENDIMENTO", MARGIN, y);
  if (data.fichaNumero) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate600);
    const numWidth = doc.getTextWidth(`Nº ${data.fichaNumero}`);
    doc.text(`Nº ${data.fichaNumero}`, PAGE_WIDTH - MARGIN - numWidth, y);
  }
  y += 5;

  // ── Data e Hora ──
  doc.setFontSize(7.5);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  let dataHoraTexto = `Data: ${data.dataConsulta}`;
  if (data.horaConsulta) dataHoraTexto += ` | Hora: ${data.horaConsulta}`;
  doc.text(dataHoraTexto, MARGIN, y);
  y += 6;

  // =====================================================
  // SEÇÃO 1: ANAMNESE
  // =====================================================
  if (data.anamnese) {
    y = drawSectionTitle(doc, "ANAMNESE", y);

    const anamneseSections = parseAnamneseSections(data.anamnese);

    for (const section of anamneseSections) {
      // Sub-título da seção (ex: "QUEIXA PRINCIPAL")
      if (section.title) {
        y = checkPageBreak(doc, y, 7);
        doc.setFontSize(7);
        doc.setFont(PDF_FONT, "bold");
        doc.setTextColor(...COLORS.slate600);
        doc.text(section.title, MARGIN + 2, y);
        y += 4;
      }
      // Conteúdo
      if (section.content) {
        doc.setFontSize(8);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        const wrapped = doc.splitTextToSize(section.content, CONTENT_WIDTH - 4);
        for (const line of wrapped) {
          y = checkPageBreak(doc, y, 4);
          doc.text(line, MARGIN + 2, y);
          y += 4;
        }
      }
      y += 2;
    }
    y += 2;
  }

  // =====================================================
  // SEÇÃO 2: HIPÓTESE DIAGNÓSTICO E CID
  // =====================================================
  if (data.cidCodes && data.cidCodes.length > 0) {
    y = drawSectionTitle(doc, "HIPÓTESE DIAGNÓSTICO E CID", y);

    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);

    for (const cid of data.cidCodes) {
      y = checkPageBreak(doc, y, 4);
      doc.text(`• ${cid.code} — ${cid.description}`, MARGIN + 4, y);
      y += 4;
    }
    y += 3;
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
      doc.setFontSize(8);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const exame of data.exames!) {
        y = checkPageBreak(doc, y, 4);
        const exameText = exame.tipo ? `${exame.nome} (${exame.tipo})` : exame.nome;
        doc.text(`• ${exameText}`, MARGIN + 4, y);
        y += 4;
      }
      y += 4;
    }

    // ── Prescrições ──
    if (hasPrescricoes) {
      y = drawSubsectionTitle(doc, "Prescrições", y);
      doc.setFontSize(8);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      data.prescricoes!.forEach((presc, index) => {
        y = checkPageBreak(doc, y, 8);
        // Linha 1: número + medicamento + dosagem
        let linha1 = `${index + 1}. ${presc.medicamento}`;
        if (presc.dosagem) linha1 += ` ${presc.dosagem}`;
        doc.setFont(PDF_FONT, "bold");
        doc.text(linha1, MARGIN + 4, y);
        y += 4;

        // Linha 2: posologia + quantidade
        if (presc.posologia || presc.duracao) {
          doc.setFont(PDF_FONT, "normal");
          doc.setTextColor(...COLORS.slate600);
          const linha2Parts: string[] = [];
          if (presc.posologia) linha2Parts.push(presc.posologia);
          if (presc.duracao) linha2Parts.push(`Qtd: ${presc.duracao}`);
          const linha2 = linha2Parts.join(" — ");
          const linhaWrapped = doc.splitTextToSize(linha2, CONTENT_WIDTH - 12);
          for (const l of linhaWrapped) {
            y = checkPageBreak(doc, y, 4);
            doc.text(l, MARGIN + 8, y);
            y += 4;
          }
          doc.setTextColor(...COLORS.slate800);
        }
        y += 2;
      });
      y += 2;
    }

    // ── Atestados e Declarações ──
    if (hasAtestados) {
      y = drawSubsectionTitle(doc, "Atestados e Declarações", y);
      doc.setFontSize(8);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const atestado of data.atestados!) {
        y = checkPageBreak(doc, y, 4);
        doc.text(`• ${atestado.nome}`, MARGIN + 4, y);
        y += 4;
      }
      y += 3;
    }
  }

  // =====================================================
  // SEÇÃO 4: ORIENTAÇÕES
  // =====================================================
  if (data.orientacoes && data.orientacoes.trim()) {
    y = drawSectionTitle(doc, "ORIENTAÇÕES", y);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    const wrapped = doc.splitTextToSize(data.orientacoes, CONTENT_WIDTH - 4);
    for (const line of wrapped) {
      y = checkPageBreak(doc, y, 4);
      doc.text(line, MARGIN + 2, y);
      y += 4;
    }
    y += 3;
  }

  // ── Assinatura (sem traço e sem data, alinhada no bottom) ──
  drawFooterSignature(doc, data, undefined, { hideDateLine: true });
  return doc.output("arraybuffer");
}
