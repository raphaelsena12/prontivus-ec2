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
  y += 8;
  
  // Label da seção
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("DECLARAÇÃO", MARGIN, y);
  y += 6;

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.setLineHeightFactor(1.6);

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

  const splitText = doc.splitTextToSize(textoAtestado, CONTENT_WIDTH);
  doc.text(splitText, MARGIN, y);
  y += splitText.length * 5 + 10;

  // =====================================================
  // HISTÓRICO DE CIDs (para tipo historico-cid)
  // =====================================================
  if (tipo === "afastamento-historico-cid") {
    y += 4;
    
    const cids = data.historicoCids && data.historicoCids.length > 0
      ? data.historicoCids
      : data.cidCodigo
        ? [{ codigo: data.cidCodigo, descricao: data.cidDescricao || "" }]
        : [];

    if (cids.length > 0) {
      // Label da seção
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.slate400);
      doc.text("HISTÓRICO DE CID-10", MARGIN, y);
      y += 6;
      
      cids.forEach((cid, index) => {
        // Separador entre itens (exceto o primeiro)
        if (index > 0) {
          doc.setDrawColor(...COLORS.slate200);
          doc.setLineWidth(0.2);
          doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2);
          y += 2;
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.slate800);
        doc.text(cid.codigo, MARGIN, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.slate600);
        doc.text(` — ${cid.descricao}`, MARGIN + doc.getTextWidth(cid.codigo), y);

        y += 9;
      });

      y += 6;
    }
  }

  // =====================================================
  // SEÇÃO CID (para tipo indeterminado)
  // =====================================================
  if (tipo === "afastamento-indeterminado" && data.cidCodigo) {
    y += 6;
    
    // Label da seção
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("CID-10", MARGIN, y);
    y += 6;

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate800);
    const cidText = data.cidDescricao
      ? `${data.cidCodigo} — ${data.cidDescricao}`
      : data.cidCodigo;
    doc.text(cidText, MARGIN, y);

    y += 12;
  }

  // =====================================================
  // AUTORIZAÇÃO DE SIGILO (para tipos com CID)
  // =====================================================
  if (tipo === "afastamento-cid" || tipo === "afastamento-historico-cid" || tipo === "afastamento-indeterminado") {
    y += 8;
    
    // Label da seção
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("AUTORIZAÇÃO", MARGIN, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    const textoAutorizacao =
      `Eu, ${data.pacienteNome}, autorizo o medico a declarar nominalmente, ou atraves do CID, ` +
      `meu diagnostico, liberando-o da guarda do sigilo profissional.`;

    const splitAuth = doc.splitTextToSize(textoAutorizacao, CONTENT_WIDTH);
    doc.text(splitAuth, MARGIN, y);
    y += splitAuth.length * 5 + 8;
  }

  // =====================================================
  // OBSERVAÇÕES (se houver)
  // =====================================================
  if (data.observacoes && data.observacoes.trim()) {
    y += 4;
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
