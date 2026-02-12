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

  const splitText = doc.splitTextToSize(texto, CONTENT_WIDTH);
  doc.text(splitText, MARGIN, y);
  y += splitText.length * 5 + 10;

  // =====================================================
  // AUTORIZAÇÃO + CID (acompanhante e horario-cid)
  // =====================================================
  if (data.tipo === "acompanhante" || data.tipo === "horario-cid") {
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

    const textoAuth =
      `Eu, ${data.pacienteNome}, autorizo o medico a declarar nominalmente, ou atraves do CID, ` +
      `meu diagnostico, liberando-o da guarda do sigilo profissional.`;

    const splitAuth = doc.splitTextToSize(textoAuth, CONTENT_WIDTH);
    doc.text(splitAuth, MARGIN, y);
    y += splitAuth.length * 5 + 8;

    // CID
    if (data.cidCodigo) {
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
