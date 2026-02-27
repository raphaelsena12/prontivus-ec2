import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawBottomBar,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PAGE_HEIGHT, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface ReceitaControleEspecialData extends BaseDocumentData {
  medicoCpf?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;
  dataValidade?: string;
  uf?: string;
  medicamentos: Array<{
    nome: string;
    dosagem?: string;
    quantidade?: number;
    posologia: string;
    duracao?: string;
  }>;
}

// =====================================================
// 19. RECEITA DE CONTROLE ESPECIAL
// =====================================================
export function generateReceitaControleEspecialPDF(data: ReceitaControleEspecialData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RECEITA DE CONTROLE ESPECIAL", MARGIN, y);
  y += 10;
  
  // ── Medicamentos ──
  if (data.medicamentos && data.medicamentos.length > 0) {
    data.medicamentos.forEach((med, index) => {
      const numMed = index + 1;
      const startX = MARGIN;
      
      // Número do medicamento
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "normal");
      doc.setTextColor(...COLORS.slate800);
      doc.text(`${numMed}.`, startX, y);
      
      // Nome do medicamento em negrito
      const nomeX = startX + 6;
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "bold");
      doc.setTextColor(...COLORS.slate800);
      doc.text(med.nome.toUpperCase(), nomeX, y);
      
      // Dosagem (se houver)
      let dosagemX = nomeX + doc.getTextWidth(med.nome.toUpperCase()) + 3;
      if (med.dosagem) {
        doc.setFontSize(10);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        doc.text(med.dosagem, dosagemX, y);
        dosagemX += doc.getTextWidth(med.dosagem) + 3;
      }
      
      // Linha tracejada para quantidade
      const linhaStartX = dosagemX;
      const linhaEndX = PAGE_WIDTH - MARGIN - 15; // Deixa espaço para o número final
      const linhaY = y - 1;
      
      // Desenhar linha tracejada
      doc.setDrawColor(...COLORS.slate800);
      doc.setLineWidth(0.2);
      const dashLength = 2;
      const gapLength = 1;
      let currentX = linhaStartX;
      while (currentX < linhaEndX) {
        const dashEnd = Math.min(currentX + dashLength, linhaEndX);
        doc.line(currentX, linhaY, dashEnd, linhaY);
        currentX = dashEnd + gapLength;
      }
      
      // Número final (quantidade)
      const numFinalX = PAGE_WIDTH - MARGIN - 10;
      if (med.quantidade) {
        doc.setFontSize(10);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        doc.text(String(med.quantidade), numFinalX, y);
      }
      
      y += 6;
      
      // Posologia (linha indentada abaixo)
      if (med.posologia) {
        const posologiaX = startX + 12; // Indentado
        let posologiaText = med.posologia;
        // Remover "por X" ou " — por X" da posologia se a duração estiver separada
        if (med.duracao) {
          posologiaText = posologiaText.replace(/\s*—\s*por\s+\d+\s*dias?/i, "");
          posologiaText = posologiaText.replace(/\s*por\s+\d+\s*dias?/i, "");
        }
        doc.setFontSize(9);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        doc.text(posologiaText.toUpperCase(), posologiaX, y);
        y += 7;
      } else {
        y += 4;
      }
    });
  }
  
  // ── Espaço em branco no meio ──
  // Posicionar os boxes no final da página
  const boxHeight = 50;
  const boxStartY = PAGE_HEIGHT - boxHeight - 20; // 20mm do rodapé
  
  // Se os medicamentos não chegaram até os boxes, deixar espaço em branco
  if (y < boxStartY - 10) {
    y = boxStartY - 10;
  } else {
    y += 20; // Adicionar espaço mínimo
  }
  
  // ── Boxes de identificação ──
  const boxWidth = CONTENT_WIDTH / 2 - 5;
  const boxHeightFinal = 50;
  const leftBoxX = MARGIN;
  const rightBoxX = PAGE_WIDTH / 2 + 5;
  
  // Box esquerdo - IDENTIFICAÇÃO DO COMPRADOR
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.5);
  doc.rect(leftBoxX, boxStartY, boxWidth, boxHeightFinal);
  
  // Título do box esquerdo
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IDENTIFICAÇÃO DO COMPRADOR", leftBoxX + boxWidth / 2, boxStartY + 6, { align: "center" });
  
  let compradorY = boxStartY + 12;
  const fieldSpacing = 5;
  
  // Campos do comprador
  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate800);
  
  // Nome
  doc.text("Nome:", leftBoxX + 3, compradorY);
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.2);
  doc.line(leftBoxX + 15, compradorY - 1, leftBoxX + boxWidth - 3, compradorY - 1);
  compradorY += fieldSpacing;
  
  // Ident e Órg. Emissor
  doc.text("Ident:", leftBoxX + 3, compradorY);
  doc.line(leftBoxX + 15, compradorY - 1, leftBoxX + boxWidth / 2 - 5, compradorY - 1);
  doc.text("Órg. Emissor:", leftBoxX + boxWidth / 2 + 2, compradorY);
  doc.line(leftBoxX + boxWidth / 2 + 30, compradorY - 1, leftBoxX + boxWidth - 3, compradorY - 1);
  compradorY += fieldSpacing;
  
  // End
  doc.text("End:", leftBoxX + 3, compradorY);
  doc.line(leftBoxX + 15, compradorY - 1, leftBoxX + boxWidth - 3, compradorY - 1);
  compradorY += fieldSpacing;
  
  // Cidade e UF
  doc.text("Cidade:", leftBoxX + 3, compradorY);
  doc.line(leftBoxX + 20, compradorY - 1, leftBoxX + boxWidth / 2 - 5, compradorY - 1);
  doc.text("UF:", leftBoxX + boxWidth / 2 + 2, compradorY);
  doc.line(leftBoxX + boxWidth / 2 + 8, compradorY - 1, leftBoxX + boxWidth - 3, compradorY - 1);
  compradorY += fieldSpacing;
  
  // Telefone
  doc.text("Telefone:(", leftBoxX + 3, compradorY);
  doc.line(leftBoxX + 22, compradorY - 1, leftBoxX + boxWidth - 3, compradorY - 1);
  doc.text(")", leftBoxX + boxWidth - 3, compradorY);
  
  // Box direito - IDENTIFICAÇÃO DO FORNECEDOR
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.5);
  doc.rect(rightBoxX, boxStartY, boxWidth, boxHeightFinal);
  
  // Título do box direito
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("IDENTIFICAÇÃO DO FORNECEDOR", rightBoxX + boxWidth / 2, boxStartY + 6, { align: "center" });
  
  let rightBoxY = boxStartY + 12;
  
  // Linha de assinatura
  doc.setDrawColor(...COLORS.slate800);
  doc.setLineWidth(0.4);
  doc.line(rightBoxX + 5, rightBoxY, rightBoxX + boxWidth - 5, rightBoxY);
  rightBoxY += 6;
  
  // Texto "ASSINATURA DO FARMACÊUTICO"
  doc.setFontSize(7);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(...COLORS.slate600);
  doc.text("ASSINATURA DO FARMACÊUTICO", rightBoxX + boxWidth / 2, rightBoxY, { align: "center" });
  
  drawBottomBar(doc, data);
  return doc.output("arraybuffer");
}
