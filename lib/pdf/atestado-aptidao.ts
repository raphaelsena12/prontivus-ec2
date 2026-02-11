import {
  createDoc, drawTopBar, drawClinicHeader, drawTitle, drawPatientCard,
  drawFooterSignature, drawBottomBar, drawSectionLabel,
  COLORS, CONTENT_WIDTH, MARGIN,
} from "./pdf-base";

interface AptidaoData {
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
  observacoes?: string;
  mesesValidade?: number;

  tipo: "fisica-mental" | "piscinas" | "fisica";
}

export function generateAtestadoAptidaoPDF(data: AptidaoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  const subtitulos: Record<string, string> = {
    "fisica-mental": "Aptidao fisica e mental",
    "piscinas": "Aptidao para frequentar piscinas",
    "fisica": "Aptidao fisica",
  };

  let y = drawTitle(doc, "ATESTADO MEDICO", subtitulos[data.tipo]);

  y = drawPatientCard(doc, data, y);

  // =====================================================
  // CORPO
  // =====================================================
  y = drawSectionLabel(doc, "DECLARACAO", y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);

  let texto: string;

  switch (data.tipo) {
    case "fisica-mental":
      texto =
        `O paciente acima identificado, foi submetido a consulta medica nesta unidade na data ` +
        `${data.dataEmissao}. Em decorrencia dos resultados apresentados, atesto que, ` +
        `o mesmo esta apto a retornar as suas atividades laborais, visto que, nao apresenta ` +
        `nenhuma patologia aparente.`;
      break;

    case "piscinas":
      texto =
        `O paciente acima identificado, foi submetido a consulta medica nesta unidade na data ` +
        `${data.dataEmissao}. Em decorrencia dos resultados apresentados, atesto que, ` +
        `o mesmo esta apto pelo exame dermatologico a frequentar piscinas.\n\nSem mais.`;
      break;

    case "fisica":
      texto =
        `O paciente acima identificado, foi submetido a consulta medica nesta unidade na data ` +
        `${data.dataEmissao}. Em decorrencia dos resultados apresentados, atesto que, ` +
        `o mesmo esta apto praticar atividades fisicas e hidroginastica, estando eutrofico ate ` +
        `o momento, com exames cardiologicos normais.\n\nSem mais.`;
      break;
  }

  const splitText = doc.splitTextToSize(texto, CONTENT_WIDTH - 4);
  doc.text(splitText, MARGIN + 2, y);
  y += splitText.length * 5 + 10;

  // =====================================================
  // VALIDADE (para piscinas e aptidão física)
  // =====================================================
  if (data.tipo === "piscinas" || data.tipo === "fisica") {
    const meses = data.mesesValidade || "__";

    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 2, 2, "S");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.text(`Atestado medico valido por ${meses} mes(es)`, MARGIN + 5, y + 9);

    y += 22;
  }

  // =====================================================
  // OBSERVAÇÕES
  // =====================================================
  if (data.observacoes && data.observacoes.trim()) {
    y = drawSectionLabel(doc, "OBSERVACOES", y);

    doc.setFillColor(...COLORS.slate50);
    const obsText = doc.splitTextToSize(data.observacoes, CONTENT_WIDTH - 14);
    const obsHeight = obsText.length * 4.5 + 8;
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, obsHeight, 2, 2, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, obsHeight, 2, 2, "S");

    doc.setFillColor(...COLORS.blue600);
    doc.roundedRect(MARGIN, y, 2, obsHeight, 1, 1, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate600);
    doc.text(obsText, MARGIN + 7, y + 5);

    y += obsHeight + 10;
  }

  drawFooterSignature(doc, data, y + 20);
  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
