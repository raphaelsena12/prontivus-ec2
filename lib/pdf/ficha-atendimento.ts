import {
  createDoc,
  drawTopBar,
  drawBottomBar,
  drawClinicHeader,
  formatCPF,
  COLORS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
} from "./pdf-base";

interface FichaAtendimentoData {
  clinicaNome: string;
  clinicaCnpj: string;
  clinicaEndereco?: string;
  logoBase64?: string;

  medicoNome: string;
  medicoCrm: string;
  medicoEspecialidade: string;

  pacienteNome: string;
  pacienteCpf: string;
  pacienteDataNascimento: string;

  dataConsulta: string;

  anamnese: string;
  cidCodes: Array<{ code: string; description: string }>;
  exames: Array<{ nome: string; tipo: string }>;
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

export function generateFichaAtendimentoPDF(data: FichaAtendimentoData): ArrayBuffer {
  const doc = createDoc();

  drawTopBar(doc);
  drawClinicHeader(doc, data);

  let y = 40;

  // =====================================================
  // TÍTULO "FICHA DE ATENDIMENTO"
  // =====================================================
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 2, 2, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("FICHA DE ATENDIMENTO", PAGE_WIDTH / 2, y + 8, { align: "center" });

  y += 18;

  // =====================================================
  // CARD: DADOS DO PACIENTE
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 3, 3, "S");
  
  // Barra lateral decorativa
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, 3, 28, 1, 1, "F");

  const pacienteY = y + 6;
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("PACIENTE", MARGIN + 8, pacienteY);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.pacienteNome, MARGIN + 8, pacienteY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(`CPF: ${formatCPF(data.pacienteCpf)}`, MARGIN + 8, pacienteY + 12);
  doc.text(
    `Data de Nascimento: ${data.pacienteDataNascimento}`,
    MARGIN + 8,
    pacienteY + 18
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate600);
  doc.text("Data da Consulta:", PAGE_WIDTH - MARGIN - 8, pacienteY + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.dataConsulta, PAGE_WIDTH - MARGIN - 8, pacienteY + 12, { align: "right" });

  y += 34;

  // =====================================================
  // CARD: DADOS DO MÉDICO
  // =====================================================
  doc.setFillColor(...COLORS.slate50);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 3, 3, "F");
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 3, 3, "S");
  
  // Barra lateral decorativa
  doc.setFillColor(...COLORS.slate800);
  doc.roundedRect(MARGIN, y, 3, 18, 1, 1, "F");
  
  const medicoY = y + 6;
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate400);
  doc.text("MÉDICO RESPONSÁVEL", MARGIN + 8, medicoY);
  
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text(data.medicoNome, MARGIN + 8, medicoY + 7);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text(
    `CRM ${data.medicoCrm} — ${data.medicoEspecialidade}`,
    MARGIN + 8,
    medicoY + 13
  );

  y += 24;

  // =====================================================
  // ANAMNESE
  // =====================================================
  if (data.anamnese && data.anamnese.trim()) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    doc.setFillColor(...COLORS.slate50);
    const anamneseLines = doc.splitTextToSize(data.anamnese, CONTENT_WIDTH - 16);
    const anamneseHeight = Math.max(anamneseLines.length * 4.5 + 12, 20);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, anamneseHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, anamneseHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, anamneseHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("ANAMNESE", MARGIN + 8, y + 6);

    let anamneseY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);
    doc.setLineHeightFactor(1.5);

    anamneseLines.forEach((line: string) => {
      if (anamneseY > PAGE_HEIGHT - 30) {
        doc.addPage();
        anamneseY = MARGIN + 12;
      }
      doc.text(line, MARGIN + 8, anamneseY);
      anamneseY += 4.5;
    });

    y += anamneseHeight + 6;
  }

  // =====================================================
  // CID-10
  // =====================================================
  if (data.cidCodes && data.cidCodes.length > 0) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    const cidHeight = data.cidCodes.length * 12 + 12;
    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cidHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cidHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, cidHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("CID-10", MARGIN + 8, y + 6);

    let cidY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);

    data.cidCodes.forEach((cid) => {
      if (cidY > PAGE_HEIGHT - 30) {
        doc.addPage();
        cidY = MARGIN + 12;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${cid.code} -`, MARGIN + 8, cidY);
      const codeWidth = doc.getTextWidth(`${cid.code} - `);
      
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(cid.description, CONTENT_WIDTH - 16 - codeWidth);
      doc.text(descLines[0], MARGIN + 8 + codeWidth, cidY);
      
      if (descLines.length > 1) {
        cidY += 4.5;
        descLines.slice(1).forEach((line: string) => {
          if (cidY > PAGE_HEIGHT - 30) {
            doc.addPage();
            cidY = MARGIN + 12;
          }
          doc.text(line, MARGIN + 8 + codeWidth, cidY);
          cidY += 4.5;
        });
      }
      
      cidY += 8;
    });

    y += cidHeight + 6;
  }

  // =====================================================
  // EXAMES SOLICITADOS
  // =====================================================
  if (data.exames && data.exames.length > 0) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    const examesHeight = data.exames.length * 10 + 12;
    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, examesHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, examesHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, examesHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("EXAMES SOLICITADOS", MARGIN + 8, y + 6);

    let exameY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);

    data.exames.forEach((exame) => {
      if (exameY > PAGE_HEIGHT - 30) {
        doc.addPage();
        exameY = MARGIN + 12;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${exame.nome}`, MARGIN + 8, exameY);
      
      if (exame.tipo) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.slate600);
        doc.text(`(${exame.tipo})`, MARGIN + 8 + doc.getTextWidth(exame.nome) + 2, exameY);
        doc.setTextColor(...COLORS.slate800);
      }
      
      exameY += 10;
    });

    y += examesHeight + 6;
  }

  // =====================================================
  // PRESCRIÇÕES
  // =====================================================
  if (data.prescricoes && data.prescricoes.length > 0) {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    y += 4;
    
    let prescricoesHeight = 12;
    data.prescricoes.forEach((presc) => {
      const lines = Math.max(
        doc.splitTextToSize(presc.medicamento, CONTENT_WIDTH - 16).length,
        doc.splitTextToSize(presc.dosagem, CONTENT_WIDTH - 16).length,
        doc.splitTextToSize(presc.posologia, CONTENT_WIDTH - 16).length,
        doc.splitTextToSize(presc.duracao, CONTENT_WIDTH - 16).length
      );
      prescricoesHeight += lines * 4.5 + 8;
    });
    
    doc.setFillColor(...COLORS.slate50);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, prescricoesHeight, 3, 3, "F");
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, prescricoesHeight, 3, 3, "S");
    
    // Barra lateral decorativa
    doc.setFillColor(...COLORS.slate800);
    doc.roundedRect(MARGIN, y, 3, prescricoesHeight, 1, 1, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate400);
    doc.text("PRESCRIÇÕES", MARGIN + 8, y + 6);

    let prescY = y + 12;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.slate800);

    data.prescricoes.forEach((presc, idx) => {
      if (prescY > PAGE_HEIGHT - 30) {
        doc.addPage();
        prescY = MARGIN + 12;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${presc.medicamento}`, MARGIN + 8, prescY);
      prescY += 4.5;
      
      doc.setFont("helvetica", "normal");
      if (presc.dosagem) {
        doc.text(`   Dosagem: ${presc.dosagem}`, MARGIN + 8, prescY);
        prescY += 4.5;
      }
      if (presc.posologia) {
        doc.text(`   Posologia: ${presc.posologia}`, MARGIN + 8, prescY);
        prescY += 4.5;
      }
      if (presc.duracao) {
        doc.text(`   Duração: ${presc.duracao}`, MARGIN + 8, prescY);
        prescY += 4.5;
      }
      
      prescY += 4;
    });

    y += prescricoesHeight + 6;
  }

  drawBottomBar(doc);

  return doc.output("arraybuffer");
}
