import {
  BaseDocumentData,
  createDoc, drawClinicHeader, drawPatientCard,
  drawFooterSignature,
  MARGIN, CONTENT_WIDTH, PAGE_WIDTH, PDF_FONT, COLORS,
} from "./pdf-base";

// =====================================================
// INTERFACE
// =====================================================
interface ReceitaSimplesData extends BaseDocumentData {
  medicoCpf?: string;
  pacienteSexo?: string;
  pacienteIdade?: number;
  medicamentos: Array<{
    nome: string;
    dosagem?: string;
    posologia: string;
    quantidade?: string;
    duracao?: string;
  }>;
}

// =====================================================
// 18. RECEITA SIMPLES
// =====================================================
export function generateReceitaSimplesPDF(data: ReceitaSimplesData): ArrayBuffer {
  const doc = createDoc();
  const headerY = drawClinicHeader(doc, data);
  let y = headerY;
  
  // ── Dados do paciente ──
  y = drawPatientCard(doc, data, y);
  
  // ── Título ──
  doc.setFontSize(16);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(...COLORS.slate800);
  doc.text("RECEITA MÉDICA", MARGIN, y);
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
      doc.text(String(numMed), startX, y);
      
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
      
      // Linha de pontos até a duração
      const pontosStartX = dosagemX;
      const numFinalX = PAGE_WIDTH - MARGIN - 10;
      
      // Calcular largura de um ponto
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, "normal");
      const pontoWidth = doc.getTextWidth(".");
      
      // Calcular espaço disponível para pontos
      let pontosEndX = numFinalX;
      if (med.duracao) {
        const duracaoWidth = doc.getTextWidth(med.duracao);
        pontosEndX = numFinalX - duracaoWidth - 5;
      }
      
      // Calcular número de pontos necessários
      const espacoDisponivel = pontosEndX - pontosStartX;
      const numPontos = Math.floor(espacoDisponivel / pontoWidth);
      
      // Desenhar linha de pontos
      doc.setTextColor(...COLORS.slate800);
      if (numPontos > 0) {
        doc.text(".".repeat(numPontos), pontosStartX, y);
      }
      
      // Número final (duração em dias) - alinhado à direita
      if (med.duracao) {
        doc.setFontSize(10);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...COLORS.slate800);
        doc.text(med.duracao, numFinalX, y);
      }
      
      y += 6;
      
      // Posologia (linha indentada abaixo) - remover "por X" se estiver
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
  
  // ── Assinatura do médico (alinhada no rodapé, sem data) ──
  drawFooterSignature(doc, data, undefined, { hideDateLine: true });
  return doc.output("arraybuffer");
}
