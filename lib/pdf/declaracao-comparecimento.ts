import {
  createDoc, drawTopBar, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawDualSignature, drawBottomBar, drawSectionLabel,
  COLORS, CONTENT_WIDTH, MARGIN,
} from "./pdf-base";

interface DeclaracaoData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaTelefone?: string;
  clinicaEmail?: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;

  dataEmissao: string;
  cidade?: string;
  horaInicio?: string;
  horaFim?: string;

  // Para declaração acompanhante
  nomeAcompanhante?: string;

  // Para declaração com CID
  cidCodigo?: string;
  cidDescricao?: string;

  tipo: "simples" | "acompanhante" | "horario-cid";
}

export function generateDeclaracaoComparecimentoPDF(data: DeclaracaoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  const subtitulos: Record<string, string> = {
    "simples": "Afastamento temporario",
    "acompanhante": "Afastamento temporario de acompanhante",
    "horario-cid": "Afastamento temporario",
  };

  let y = drawTitle(doc, "DECLARACAO DE COMPARECIMENTO", subtitulos[data.tipo]);

  y = drawPatientCard(doc, data, y);

  // =====================================================
  // CORPO
  // =====================================================
  y = drawSectionLabel(doc, "DECLARACAO", y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);

  const horaInicio = data.horaInicio || "____";
  const horaFim = data.horaFim || "____";

  let texto: string;

  switch (data.tipo) {
    case "simples":
      texto =
        `Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade ` +
        `medica no dia ${data.dataEmissao}, as ${horaInicio} ate ${horaFim}.`;
      break;

    case "acompanhante": {
      const acompanhante = data.nomeAcompanhante || "________________________________";
      texto =
        `Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade ` +
        `medica no dia ${data.dataEmissao}, as ${horaInicio} ate ${horaFim}. ` +
        `Acompanhado(a) do Sr(a) ${acompanhante}.`;
      break;
    }

    case "horario-cid":
      texto =
        `Declaramos para os devidos fins que, o paciente identificado, compareceu a esta unidade ` +
        `medica no dia ${data.dataEmissao}, as ${horaInicio} ate ${horaFim}.`;
      break;
  }

  const splitText = doc.splitTextToSize(texto, CONTENT_WIDTH - 4);
  doc.text(splitText, MARGIN + 2, y);
  y += splitText.length * 5 + 10;

  // =====================================================
  // AUTORIZAÇÃO + CID (acompanhante e horario-cid)
  // =====================================================
  if (data.tipo === "acompanhante" || data.tipo === "horario-cid") {
    y = drawSectionLabel(doc, "AUTORIZACAO", y);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);

    const textoAuth =
      `Eu, ${data.pacienteNome}, autorizo o medico a declarar nominalmente, ou atraves do CID, ` +
      `meu diagnostico, liberando-o da guarda do sigilo profissional.`;

    const splitAuth = doc.splitTextToSize(textoAuth, CONTENT_WIDTH - 4);
    doc.text(splitAuth, MARGIN + 2, y);
    y += splitAuth.length * 4.5 + 8;

    // CID
    if (data.cidCodigo) {
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
  }

  // =====================================================
  // ASSINATURA
  // =====================================================
  if (data.tipo === "acompanhante" || data.tipo === "horario-cid") {
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
