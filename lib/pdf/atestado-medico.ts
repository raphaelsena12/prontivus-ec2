import jsPDF from "jspdf";
import {
  createDoc, drawTopBar, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawDualSignature, drawBottomBar, drawSectionLabel,
  drawObservationCard, formatCPF, formatCNPJ, extenso,
  COLORS, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
} from "./pdf-base";

interface AtestadoData {
  // Clínica
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  // Médico
  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;

  // Paciente
  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;

  // Atestado
  diasAfastamento: number;
  cidCodigo?: string;
  cidDescricao?: string;
  incluirCid: boolean;
  observacoes?: string;
  dataEmissao: string;
  cidade?: string;

  // Tipo de atestado
  tipo?: "afastamento" | "afastamento-cid" | "afastamento-sem-cid" | "afastamento-historico-cid" | "afastamento-indeterminado";
  historicoCids?: Array<{ codigo: string; descricao: string }>;
}

export function generateAtestadoPDF(data: AtestadoData): ArrayBuffer {
  const doc = createDoc();
  const tipo = data.tipo || "afastamento";

  // =====================================================
  // BARRA SUPERIOR
  // =====================================================
  drawTopBar(doc);

  // =====================================================
  // CABEÇALHO DA CLÍNICA
  // =====================================================
  drawClinicHeader(doc, data);

  // =====================================================
  // TÍTULO
  // =====================================================
  let subtituloMap: Record<string, string> = {
    "afastamento": "Afastamento temporario",
    "afastamento-cid": "Afastamento temporario",
    "afastamento-sem-cid": "Afastamento temporario",
    "afastamento-historico-cid": "Historico de CID",
    "afastamento-indeterminado": "Afastamento por tempo indeterminado",
  };

  let y = drawTitle(doc, "ATESTADO MEDICO", subtituloMap[tipo] || "Documento emitido para os devidos fins");

  // =====================================================
  // CARD: IDENTIFICAÇÃO DO PACIENTE
  // =====================================================
  y = drawPatientCard(doc, data, y);

  // =====================================================
  // CORPO DO ATESTADO
  // =====================================================
  y = drawSectionLabel(doc, "DECLARACAO", y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);

  let textoAtestado: string;

  if (tipo === "afastamento-indeterminado") {
    textoAtestado =
      `O paciente acima identificado, foi submetido a consulta medica nesta unidade na data ` +
      `${data.dataEmissao}. Em decorrencia dos resultados apresentados, o mesmo devera ficar ` +
      `em repouso e afastado de suas atividades laborais por tempo indeterminado.`;
  } else if (tipo === "afastamento-historico-cid") {
    textoAtestado =
      `O paciente acima identificado, foi submetido a consulta medica nesta unidade na data ` +
      `${data.dataEmissao}.`;
  } else {
    textoAtestado =
      `Atesto, para os devidos fins, que o(a) paciente ${data.pacienteNome}, ` +
      `portador(a) do CPF ${formatCPF(data.pacienteCpf)}, ` +
      `esteve sob meus cuidados medicos e necessita de afastamento de suas atividades ` +
      `por um periodo de ${data.diasAfastamento} (${extenso(data.diasAfastamento)}) dia(s), ` +
      `a partir da data de ${data.dataEmissao}.`;
  }

  if (tipo === "afastamento-cid" && data.cidCodigo) {
    textoAtestado += `\n\nCID-10: ${data.cidCodigo}`;
    if (data.cidDescricao) {
      textoAtestado += ` — ${data.cidDescricao}`;
    }
  }

  const splitText = doc.splitTextToSize(textoAtestado, CONTENT_WIDTH - 4);
  doc.text(splitText, MARGIN + 2, y);
  y += splitText.length * 5 + 8;

  // =====================================================
  // HISTÓRICO DE CIDs (para tipo historico-cid)
  // =====================================================
  if (tipo === "afastamento-historico-cid") {
    y = drawSectionLabel(doc, "HISTORICO DE CID", y);

    const cids = data.historicoCids && data.historicoCids.length > 0
      ? data.historicoCids
      : data.cidCodigo
        ? [{ codigo: data.cidCodigo, descricao: data.cidDescricao || "" }]
        : [];

    if (cids.length > 0) {
      doc.setFillColor(...COLORS.slate50);
      const cidHeight = cids.length * 8 + 8;
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cidHeight, 2, 2, "F");
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cidHeight, 2, 2, "S");

      let cidY = y + 6;
      cids.forEach((cid) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(cid.codigo, MARGIN + 5, cidY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.slate600);
        doc.text(` — ${cid.descricao}`, MARGIN + 5 + doc.getTextWidth(cid.codigo), cidY);

        cidY += 8;
      });

      y += cidHeight + 8;
    }
  }

  // =====================================================
  // SEÇÃO CID (para tipo indeterminado)
  // =====================================================
  if (tipo === "afastamento-indeterminado" && data.cidCodigo) {
    y = drawSectionLabel(doc, "CID-10", y);

    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "S");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    const cidText = data.cidDescricao
      ? `${data.cidCodigo} — ${data.cidDescricao}`
      : data.cidCodigo;
    doc.text(cidText, MARGIN + 5, y + 9);

    y += 22;
  }

  // =====================================================
  // AUTORIZAÇÃO DE SIGILO (para tipos com CID)
  // =====================================================
  if (tipo === "afastamento-cid" || tipo === "afastamento-historico-cid" || tipo === "afastamento-indeterminado") {
    y = drawSectionLabel(doc, "AUTORIZACAO", y);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);

    const textoAutorizacao =
      `Eu, ${data.pacienteNome}, autorizo o medico a declarar nominalmente, ou atraves do CID, ` +
      `meu diagnostico, liberando-o da guarda do sigilo profissional.`;

    const splitAuth = doc.splitTextToSize(textoAutorizacao, CONTENT_WIDTH - 4);
    doc.text(splitAuth, MARGIN + 2, y);
    y += splitAuth.length * 4.5 + 8;
  }

  // =====================================================
  // OBSERVAÇÕES (se houver)
  // =====================================================
  if (data.observacoes && data.observacoes.trim()) {
    y = drawSectionLabel(doc, "OBSERVACOES", y);
    y = drawObservationCard(doc, data.observacoes, y);
  }

  // =====================================================
  // RODAPÉ: ASSINATURA
  // =====================================================
  const needsDualSignature =
    tipo === "afastamento-cid" ||
    tipo === "afastamento-historico-cid" ||
    tipo === "afastamento-indeterminado";

  if (needsDualSignature) {
    drawDualSignature(doc, {
      ...data,
      pacienteNome: data.pacienteNome,
    }, y + 20);
  } else {
    drawFooterSignature(doc, data, y + 20);
  }

  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
