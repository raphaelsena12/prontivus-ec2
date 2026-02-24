/**
 * Carrega a fonte Inter a partir dos arquivos WOFF do @fontsource/inter,
 * converte para TTF (usando zlib built-in do Node.js) e retorna base64.
 * Os resultados são cacheados em memória após o primeiro carregamento.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";

interface WoffTable {
  tag: string;
  offset: number;
  compLength: number;
  origLength: number;
  origChecksum: number;
}

function woffToTtf(woffBuffer: Buffer): Buffer {
  // Verifica assinatura WOFF
  if (woffBuffer.readUInt32BE(0) !== 0x774f4646) {
    throw new Error("Arquivo não é WOFF válido");
  }

  const flavor = woffBuffer.readUInt32BE(4);   // sfnt flavor (0x00010000 = TrueType)
  const numTables = woffBuffer.readUInt16BE(12);

  // Lê tabela de diretório WOFF (começa no offset 44)
  const tables: WoffTable[] = [];
  for (let i = 0; i < numTables; i++) {
    const base = 44 + i * 20;
    tables.push({
      tag: woffBuffer.subarray(base, base + 4).toString("ascii"),
      offset: woffBuffer.readUInt32BE(base + 4),
      compLength: woffBuffer.readUInt32BE(base + 8),
      origLength: woffBuffer.readUInt32BE(base + 12),
      origChecksum: woffBuffer.readUInt32BE(base + 16),
    });
  }

  // Descomprime dados de cada tabela
  const tableData: Buffer[] = tables.map((t) => {
    const raw = woffBuffer.subarray(t.offset, t.offset + t.compLength);
    return t.compLength < t.origLength ? zlib.inflateSync(raw) : raw;
  });

  // Monta o arquivo TTF/SFNT
  const sfntHeaderSize = 12 + numTables * 16;
  const offsets: number[] = [];
  let dataPos = sfntHeaderSize;
  for (let i = 0; i < numTables; i++) {
    offsets.push(dataPos);
    dataPos += Math.ceil(tableData[i].length / 4) * 4; // alinha em 4 bytes
  }

  const ttf = Buffer.alloc(dataPos, 0);

  // Offset table (sfnt header)
  ttf.writeUInt32BE(flavor, 0);
  ttf.writeUInt16BE(numTables, 4);

  let sr = 1, es = 0;
  while (sr * 2 <= numTables) { sr *= 2; es++; }
  ttf.writeUInt16BE(sr * 16, 6);   // searchRange
  ttf.writeUInt16BE(es, 8);         // entrySelector
  ttf.writeUInt16BE((numTables - sr) * 16, 10); // rangeShift

  // Table directory
  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16;
    ttf.write(tables[i].tag, base, 4, "ascii");
    ttf.writeUInt32BE(tables[i].origChecksum, base + 4);
    ttf.writeUInt32BE(offsets[i], base + 8);
    ttf.writeUInt32BE(tableData[i].length, base + 12);
  }

  // Table data
  for (let i = 0; i < numTables; i++) {
    tableData[i].copy(ttf, offsets[i]);
  }

  return ttf;
}

// Cache em memória
let cachedRegular: string | null = null;
let cachedBold: string | null = null;
let cachedItalic: string | null = null;

const FONTS_DIR = path.join(
  process.cwd(),
  "node_modules/@fontsource/inter/files"
);

export function getInterFonts(): { regular: string; bold: string; italic: string | null } | null {
  try {
    if (!cachedRegular || !cachedBold) {
      const regularWoff = fs.readFileSync(
        path.join(FONTS_DIR, "inter-latin-400-normal.woff")
      );
      const boldWoff = fs.readFileSync(
        path.join(FONTS_DIR, "inter-latin-700-normal.woff")
      );
      cachedRegular = woffToTtf(regularWoff).toString("base64");
      cachedBold = woffToTtf(boldWoff).toString("base64");

      // Italic is optional — load if available
      try {
        const italicWoff = fs.readFileSync(
          path.join(FONTS_DIR, "inter-latin-400-italic.woff")
        );
        cachedItalic = woffToTtf(italicWoff).toString("base64");
      } catch {
        cachedItalic = null;
      }
    }
    return { regular: cachedRegular!, bold: cachedBold!, italic: cachedItalic };
  } catch (e) {
    console.warn("Inter font não disponível, usando fallback Helvetica:", e);
    return null;
  }
}
