import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import signpdf from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import QRCode from "qrcode";

export type SignPdfInput = {
  pdfBuffer: Buffer;
  pfxBuffer: Buffer;
  passphrase: string;
  signingTime?: Date;
  reason?: string;
  contactInfo?: string;
  name?: string;
  location?: string;
  crm?: string;
  especialidade?: string;
  signatureLength?: number;
};

interface SignatureVisualOpts {
  name: string;
  contactInfo: string;
  crm: string;
  especialidade: string;
  location: string;
  reason: string;
  signingTime?: Date;
}

/** Remove prefixo "CRM-XX" duplicado e retorna o CRM limpo para exibição */
function cleanCRM(crm: string): string {
  return crm.replace(/^CRM\s*-?\s*/i, "").trim() || crm;
}

/** Remove qualquer prefixo de título médico do nome (Dr., Dra., Dr(a).) */
function stripTitle(nome: string): string {
  return nome.replace(/^(Dr\(a\)\.\s*|Dra\.\s*|Dr\.\s*|Dr\s+)/i, "").trim() || nome;
}

async function buildSignatureBlock(
  pdfDoc: PDFDocument,
  page: PDFPage,
  widgetRect: number[],
  opts: SignatureVisualOpts,
): Promise<void> {
  const [bx, by, bx2, by2] = widgetRect;
  const bw = bx2 - bx;
  const bh = by2 - by;

  // Cores
  const navy     = rgb(0.07, 0.19, 0.46);
  const blue     = rgb(0.20, 0.45, 0.78);
  const bgLight  = rgb(0.95, 0.97, 1.00);
  const darkText = rgb(0.10, 0.10, 0.12);
  const grayText = rgb(0.40, 0.42, 0.46);
  const white    = rgb(1, 1, 1);
  const gold     = rgb(0.98, 0.82, 0.22);

  // Fontes
  const bold    = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const regular = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  const oblique = pdfDoc.embedStandardFont(StandardFonts.HelveticaOblique);

  // Fundo branco azulado + borda navy
  page.drawRectangle({
    x: bx, y: by, width: bw, height: bh,
    color: bgLight,
    borderColor: navy,
    borderWidth: 0.8,
  });

  // Faixa azul escura no topo
  const barH = 14;
  page.drawRectangle({
    x: bx, y: by + bh - barH,
    width: bw, height: barH,
    color: navy,
  });

  // Filete azul na borda esquerda
  page.drawRectangle({
    x: bx, y: by, width: 3, height: bh - barH,
    color: blue,
  });

  // Titulo na faixa
  page.drawText("ASSINADO DIGITALMENTE", {
    x: bx + 10,
    y: by + bh - barH + 4,
    size: 7.5,
    font: bold,
    color: white,
  });

  // Badge ICP-Brasil (direita da faixa)
  page.drawText("ICP-Brasil", {
    x: bx + bw - 50,
    y: by + bh - barH + 4,
    size: 7,
    font: bold,
    color: gold,
  });

  // ----- QR Code -----
  const contentH = bh - barH;
  const qrPad    = 4;
  const qrSize   = contentH - qrPad * 2;
  const qrX      = bx + 10;
  const qrY      = by + qrPad;

  const datePtBR = opts.signingTime
    ? `${opts.signingTime.toLocaleDateString("pt-BR")} ${opts.signingTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  const qrContent = [
    "Assinado Digitalmente",
    opts.name        && `Medico: ${opts.name}`,
    opts.crm         && `CRM: ${opts.crm}`,
    opts.contactInfo && `Email: ${opts.contactInfo}`,
    datePtBR         && `Data: ${datePtBR}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 150,
      margin: 1,
      color: { dark: "#112277", light: "#F2F5FF" },
    });
    const qrPng   = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  } catch {
    page.drawRectangle({ x: qrX, y: qrY, width: qrSize, height: qrSize, borderColor: blue, borderWidth: 0.5 });
    page.drawText("QR", { x: qrX + qrSize / 2 - 4, y: qrY + qrSize / 2 - 4, size: 7, font: regular, color: grayText });
  }

  // Linha divisória vertical
  const divX = bx + 10 + qrSize + 8;
  page.drawLine({
    start: { x: divX, y: by + 5 },
    end:   { x: divX, y: by + contentH - 4 },
    thickness: 0.5,
    color: blue,
    opacity: 0.35,
  });

  // ----- Textos à direita -----
  const tx    = divX + 9;
  const lineH = 10.5;
  let   ty    = by + contentH - 12;

  if (opts.name) {
    page.drawText(`Dr(a). ${stripTitle(opts.name)}`, { x: tx, y: ty, size: 9, font: bold, color: darkText });
    ty -= lineH;
  }

  const crmLine = [
    opts.crm         && `CRM ${cleanCRM(opts.crm)}`,
    opts.especialidade,
  ].filter(Boolean).join("  |  ");
  if (crmLine) {
    page.drawText(crmLine, { x: tx, y: ty, size: 7.5, font: regular, color: grayText });
    ty -= lineH;
  }

  if (opts.contactInfo) {
    page.drawText(opts.contactInfo, { x: tx, y: ty, size: 7.5, font: regular, color: grayText });
    ty -= lineH;
  }

  if (datePtBR) {
    page.drawText(datePtBR, { x: tx, y: ty, size: 7.5, font: regular, color: grayText });
  }

  // Texto legal no rodapé do bloco
  page.drawText("Validade juridica nos termos da MP 2.200-2/2001 e Lei 14.063/2020.", {
    x: tx,
    y: by + 5,
    size: 6,
    font: oblique,
    color: grayText,
  });
}

// -------------------------------------------------------

export async function signPdfBufferWithP12({
  pdfBuffer,
  pfxBuffer,
  passphrase,
  signingTime,
  reason = "Assinatura digital",
  contactInfo = "",
  name = "",
  location = "",
  crm = "",
  especialidade = "",
  signatureLength = 16384,
}: SignPdfInput): Promise<Buffer> {
  console.log("[PAdES Sign] Iniciando assinatura, tamanho PDF original:", pdfBuffer.length);

  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  const pages    = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  console.log("[PAdES Sign] Dimensoes da pagina:", { width, height, totalPages: pages.length });

  // Bloco de assinatura: metade direita da página, acima da assinatura do médico.
  // O rodapé jsPDF (drawFooterSignature) ocupa ~80mm do fundo (footerY ≈ 217mm do topo).
  // Convertendo A4: (297-217mm) * 2.835 ≈ 227pt do fundo → usamos proporção para qualquer tamanho.
  const marginSide      = 20;
  const blockWidth      = Math.round((width - marginSide * 2) / 2);
  const signatureHeight = 80;
  // posiciona justo acima da assinatura jsPDF (sigY ≈ 119–147pt do fundo para A4)
  const marginBottom    = Math.round(height * 0.178) - 50;

  const widgetRect = [
    width - marginSide - blockWidth,  // metade direita
    marginBottom,
    width - marginSide,
    marginBottom + signatureHeight,
  ];

  const visualOpts: SignatureVisualOpts = {
    name, contactInfo, crm, especialidade, location, reason, signingTime,
  };

  // Adicionar placeholder do campo de assinatura
  pdflibAddPlaceholder({
    pdfPage: lastPage,
    reason,
    contactInfo,
    name,
    location,
    signingTime,
    signatureLength,
    widgetRect,
  });

  const pdfWithPlaceholderBytes  = await pdfDoc.save({ useObjectStreams: false });
  const pdfWithPlaceholderBuffer = Buffer.from(pdfWithPlaceholderBytes);

  console.log("[PAdES Sign] PDF com placeholder:", {
    tamanhoOriginal: pdfBuffer.length,
    tamanhoComPlaceholder: pdfWithPlaceholderBuffer.length,
    widgetRect,
  });

  const signer = new P12Signer(pfxBuffer, { passphrase });
  const signed = await signpdf.sign(pdfWithPlaceholderBuffer, signer, signingTime);

  console.log("[PAdES Sign] PDF assinado:", {
    tamanhoOriginal: pdfBuffer.length,
    tamanhoAssinado: signed.length,
    diferenca: signed.length - pdfBuffer.length,
  });

  // Redesenhar elementos visuais no PDF já assinado (garante visibilidade)
  try {
    const signedDoc  = await PDFDocument.load(signed, { ignoreEncryption: true, updateMetadata: false });
    const signedPage = signedDoc.getPages()[signedDoc.getPageCount() - 1];
    const { width: sw, height: sh } = signedPage.getSize();
    const sBlockWidth     = Math.round((sw - marginSide * 2) / 2);
    const sMarginBottom   = Math.round(sh * 0.178) - 50;

    const signedWidgetRect = [
      sw - marginSide - sBlockWidth,
      sMarginBottom,
      sw - marginSide,
      sMarginBottom + signatureHeight,
    ];

    await buildSignatureBlock(signedDoc, signedPage, signedWidgetRect, visualOpts);

    const finalBytes = await signedDoc.save({ useObjectStreams: false });
    console.log("[PAdES Sign] PDF final com visuais, tamanho:", finalBytes.length);
    return Buffer.from(finalBytes);
  } catch (postErr: any) {
    console.error("[PAdES Sign] Erro ao redesenhar visuais pos-assinatura:", postErr.message);
    return signed;
  }
}
