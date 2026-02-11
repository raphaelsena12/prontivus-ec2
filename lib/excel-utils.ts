import * as XLSX from "xlsx";

export interface ExcelRow {
  [key: string]: any;
}

export function parseExcelFile(buffer: Buffer): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
  }) as ExcelRow[];

  return data;
}

export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  // Tentar diferentes formatos de data
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD/MM/YYYY
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`);
      } else if (format === formats[1]) {
        // YYYY-MM-DD
        return new Date(dateStr);
      } else if (format === formats[2]) {
        // DD-MM-YYYY
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`);
      }
    }
  }

  // Tentar parse direto
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parseBoolean(value: string | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  
  const str = String(value).toLowerCase().trim();
  return str === "sim" || str === "s" || str === "true" || str === "1" || str === "ativo";
}

export function cleanCPF(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const cleaned = String(cpf).replace(/\D/g, "");
  return cleaned.length === 11 ? cleaned : null;
}

export function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned : null;
}
