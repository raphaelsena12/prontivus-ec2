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
  orientacoesConduta?: string;
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

/**
 * Nomenclatura canônica e ordem dos tópicos da anamnese — exatamente igual
 * ao que o médico vê no Step2Anamnesis durante o atendimento.
 */
const ANAMNESE_CANONICAL_SECTIONS = [
  { key: "queixaPrincipal", label: "QUEIXA PRINCIPAL", aliases: ["QUEIXA PRINCIPAL", "QP"] },
  { key: "hda", label: "HISTÓRIA DA DOENÇA ATUAL", aliases: ["HISTÓRIA DA DOENÇA ATUAL", "HDA", "HISTORIA DA DOENCA ATUAL"] },
  {
    key: "antecedentesHabitosSocial",
    label: "ANTECEDENTES PESSOAIS / HÁBITOS DE VIDA / HISTÓRIA SOCIAL",
    aliases: [
      "ANTECEDENTES PESSOAIS / HÁBITOS DE VIDA / HISTÓRIA SOCIAL",
      "ANTECEDENTES PESSOAIS PATOLÓGICOS",
      "ANTECEDENTES PESSOAIS",
      "HÁBITOS DE VIDA / HISTÓRIA SOCIAL",
      "HÁBITOS DE VIDA",
      "HISTÓRIA SOCIAL",
    ],
  },
  { key: "antecedentesFamiliares", label: "ANTECEDENTES FAMILIARES", aliases: ["ANTECEDENTES FAMILIARES"] },
  { key: "medicamentosUso", label: "MEDICAMENTOS EM USO ATUAL", aliases: ["MEDICAMENTOS EM USO ATUAL", "MEDICAMENTOS EM USO", "MEDICAMENTOS"] },
  { key: "examesFisicos", label: "EXAMES FÍSICOS", aliases: ["EXAMES FÍSICOS", "EXAME FÍSICO", "EXAMES REALIZADOS"] },
] as const;

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeKey = (s: string) =>
  stripDiacritics(s).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/** Resolve um título qualquer (JSON key, texto, alias, camelCase) para o label canônico. */
function resolveCanonicalLabel(rawTitle: string): { label: string; order: number } | null {
  const norm = normalizeKey(rawTitle);
  if (!norm) return null;
  for (let i = 0; i < ANAMNESE_CANONICAL_SECTIONS.length; i++) {
    const sec = ANAMNESE_CANONICAL_SECTIONS[i];
    if (normalizeKey(sec.key) === norm) return { label: sec.label, order: i };
    for (const alias of sec.aliases) {
      if (normalizeKey(alias) === norm) return { label: sec.label, order: i };
    }
  }
  return null;
}

/** Converte anamnese (JSON ou texto livre) em lista de seções { title, content }
 *  com nomenclatura canônica e ordem fixa. */
function parseAnamneseSections(anamnese: string): Array<{ title: string; content: string }> {
  const trimmed = anamnese.trim();
  const collected: Array<{ rawTitle: string; content: string }> = [];

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && String(v).trim()) collected.push({ rawTitle: k, content: String(v).trim() });
      }
    } catch {
      // fall through
    }
  }

  if (collected.length === 0) {
    const lines = trimmed.split("\n");
    let currentTitle = "";
    let currentLines: string[] = [];
    const flush = () => {
      const content = currentLines.join("\n").trim();
      if (currentTitle || content) collected.push({ rawTitle: currentTitle, content });
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
  }

  if (collected.length === 0) {
    return [{ title: "", content: trimmed }];
  }

  // Mapeia para labels canônicos e ordena pela ordem definida
  const canonical: Array<{ label: string; content: string; order: number }> = [];
  const extras: Array<{ label: string; content: string }> = [];
  const merged = new Map<number, { label: string; content: string; order: number }>();

  for (const { rawTitle, content } of collected) {
    if (!content) continue;
    const resolved = resolveCanonicalLabel(rawTitle);
    if (resolved) {
      const existing = merged.get(resolved.order);
      if (existing) {
        existing.content = `${existing.content}\n${content}`.trim();
      } else {
        merged.set(resolved.order, { label: resolved.label, content, order: resolved.order });
      }
    } else if (rawTitle.trim()) {
      extras.push({ label: rawTitle.trim().toUpperCase(), content });
    } else {
      extras.push({ label: "", content });
    }
  }

  for (const v of merged.values()) canonical.push(v);
  canonical.sort((a, b) => a.order - b.order);

  const final: Array<{ title: string; content: string }> = canonical.map(({ label, content }) => ({ title: label, content }));
  for (const e of extras) final.push({ title: e.label, content: e.content });

  return final;
}

function drawSectionTitle(
  doc: ReturnType<typeof createDoc>,
  title: string,
  y: number,
  fontSize = 10,
): number {
  y = checkPageBreak(doc, y, 12);
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
  y = checkPageBreak(doc, y, 9);
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
  const renderAnamneseBlock = (
    title: string | undefined,
    content: string,
  ) => {
    if (title) {
      y = checkPageBreak(doc, y, 9);
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate600);
      doc.text(title.toUpperCase(), MARGIN + 2, y);
      y += 5;
    }
    if (content) {
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);
      const lineHeight = 5;
      const wrapped = doc.splitTextToSize(content, CONTENT_WIDTH - 4) as string[];
      wrapped.forEach((line, idx) => {
        y = checkPageBreak(doc, y, lineHeight);
        const isLast = idx === wrapped.length - 1;
        if (isLast) {
          doc.text(line, MARGIN + 2, y);
        } else {
          doc.text(line, MARGIN + 2, y, { align: "justify", maxWidth: CONTENT_WIDTH - 4 });
        }
        y += lineHeight;
      });
    }
    y += 3;
  };

  const hasAnamnese = !!(data.anamnese && data.anamnese.trim());
  const hasOrientacoesConduta = !!(data.orientacoesConduta && data.orientacoesConduta.trim());

  if (hasAnamnese || hasOrientacoesConduta) {
    y = drawSectionTitle(doc, "ANAMNESE", y, 10);

    if (hasAnamnese) {
      const anamneseSections = parseAnamneseSections(data.anamnese!);
      for (const section of anamneseSections) {
        renderAnamneseBlock(section.title, section.content);
      }
    }

    if (hasOrientacoesConduta) {
      renderAnamneseBlock("Orientações e conduta", data.orientacoesConduta!.trim());
    }

    y += 2;
  }

  // =====================================================
  // SEÇÃO 2: HIPÓTESE DIAGNÓSTICO E CID
  // =====================================================
  if (data.cidCodes && data.cidCodes.length > 0) {
    y = drawSectionTitle(doc, "HIPÓTESE DIAGNÓSTICO E CID", y);

    doc.setFontSize(9.5);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);

    for (const cid of data.cidCodes) {
      y = checkPageBreak(doc, y, 5);
      doc.text(`• ${cid.code} — ${cid.description}`, MARGIN + 4, y);
      y += 5;
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
      doc.setFontSize(9.5);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const exame of data.exames!) {
        y = checkPageBreak(doc, y, 5);
        const exameText = exame.tipo ? `${exame.nome} (${exame.tipo})` : exame.nome;
        doc.text(`• ${exameText}`, MARGIN + 4, y);
        y += 5;
      }
      y += 4;
    }

    // ── Prescrições ──
    if (hasPrescricoes) {
      y = drawSubsectionTitle(doc, "Prescrições", y);
      doc.setFontSize(9.5);
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

        // Linha 2: posologia + quantidade
        if (presc.posologia || presc.duracao) {
          doc.setFont(PDF_FONT, "normal");
          doc.setTextColor(...COLORS.slate600);
          const linha2Parts: string[] = [];
          if (presc.posologia) linha2Parts.push(presc.posologia);
          if (presc.duracao) linha2Parts.push(`Qtd: ${presc.duracao}`);
          const linha2 = linha2Parts.join(" · ");
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
      y += 2;
    }

    // ── Atestados e Declarações ──
    if (hasAtestados) {
      y = drawSubsectionTitle(doc, "Atestados e Declarações", y);
      doc.setFontSize(9.5);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);

      for (const atestado of data.atestados!) {
        y = checkPageBreak(doc, y, 5);
        doc.text(`• ${atestado.nome}`, MARGIN + 4, y);
        y += 5;
      }
      y += 3;
    }
  }

  // =====================================================
  // SEÇÃO 4: ORIENTAÇÕES (separada da anamnese)
  // =====================================================
  if (data.orientacoes && data.orientacoes.trim()) {
    // Espaço extra antes do título para indicar que não faz parte da anamnese
    y += 8;
    y = drawSectionTitle(doc, "ORIENTAÇÕES", y, 10);
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...COLORS.slate800);
    const lineHeight = 5;
    const wrapped = doc.splitTextToSize(data.orientacoes.trim(), CONTENT_WIDTH - 4) as string[];
    wrapped.forEach((line, idx) => {
      y = checkPageBreak(doc, y, lineHeight);
      const isLast = idx === wrapped.length - 1;
      if (isLast) {
        doc.text(line, MARGIN + 2, y);
      } else {
        doc.text(line, MARGIN + 2, y, { align: "justify", maxWidth: CONTENT_WIDTH - 4 });
      }
      y += lineHeight;
    });
    y += 3;
  }

  // ── Assinatura (sem traço e sem data, alinhada no bottom) ──
  drawFooterSignature(doc, data, undefined, { hideDateLine: true });
  return doc.output("arraybuffer");
}
