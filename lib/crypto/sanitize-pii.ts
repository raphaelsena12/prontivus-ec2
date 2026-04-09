/**
 * LGPD — Sanitização de PII antes de enviar dados para a OpenAI.
 *
 * Remove ou substitui dados pessoais identificáveis (nome, CPF, RG, telefone,
 * email, endereço) por placeholders genéricos, preservando apenas informações
 * clínicas (sintomas, sinais vitais, diagnósticos, idade, sexo).
 */

// ── Regex patterns para PII comuns em texto brasileiro ──────────────────────

/** CPF: 000.000.000-00 ou 00000000000 */
const CPF_REGEX = /\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g;

/** RG genérico: 7-10 dígitos opcionalmente separados por ponto/hífen */
const RG_REGEX = /\bRG[\s:]*\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{0,2}\b/gi;

/** Telefone: (XX) XXXXX-XXXX ou variações */
const PHONE_REGEX = /\(?\d{2}\)?[\s.-]?\d{4,5}[-.\s]?\d{4}\b/g;

/** Email */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/** CEP: 00000-000 */
const CEP_REGEX = /\b\d{5}-?\d{3}\b/g;

/**
 * Remove PII genérica (CPF, telefone, email, CEP, RG) de um texto.
 */
function stripGenericPII(text: string): string {
  return text
    .replace(CPF_REGEX, "[CPF_REMOVIDO]")
    .replace(RG_REGEX, "[RG_REMOVIDO]")
    .replace(PHONE_REGEX, "[TELEFONE_REMOVIDO]")
    .replace(EMAIL_REGEX, "[EMAIL_REMOVIDO]")
    .replace(CEP_REGEX, "[CEP_REMOVIDO]");
}

/**
 * Remove ocorrências do nome do paciente (e variações parciais) de um texto.
 * Faz match case-insensitive e trata nomes compostos.
 */
function stripPatientName(text: string, patientName: string): string {
  if (!patientName || patientName.trim().length < 2) return text;

  const nameParts = patientName.trim().split(/\s+/).filter((p) => p.length >= 3);
  let result = text;

  // Substituir nome completo primeiro
  const fullNameRegex = new RegExp(escapeRegex(patientName.trim()), "gi");
  result = result.replace(fullNameRegex, "[PACIENTE]");

  // Substituir cada parte do nome (exceto preposições comuns)
  const prepositions = new Set(["de", "da", "do", "das", "dos", "e"]);
  for (const part of nameParts) {
    if (prepositions.has(part.toLowerCase())) continue;
    const partRegex = new RegExp(`\\b${escapeRegex(part)}\\b`, "gi");
    result = result.replace(partRegex, "[PACIENTE]");
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Interface pública ───────────────────────────────────────────────────────

export interface SanitizeOptions {
  /** Nome completo do paciente para remoção nominal */
  patientName?: string;
}

/**
 * Sanitiza um texto removendo PII antes de enviar para a OpenAI.
 *
 * - Remove CPF, RG, telefone, email, CEP via regex
 * - Remove o nome do paciente (e partes do nome) se fornecido
 *
 * Dados clínicos (sintomas, diagnósticos, medicamentos, sinais vitais) são preservados.
 */
export function sanitizeTextForAI(text: string, options?: SanitizeOptions): string {
  if (!text) return text;

  let sanitized = stripGenericPII(text);

  if (options?.patientName) {
    sanitized = stripPatientName(sanitized, options.patientName);
  }

  return sanitized;
}

/**
 * Calcula a idade a partir da data de nascimento.
 * Retorna null se a data não for válida.
 */
export function calculateAge(birthDate: Date | string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  return Math.floor(
    (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

/**
 * Gera um cabeçalho demográfico anonimizado para enviar à OpenAI.
 * Retorna apenas idade e sexo — sem nome, CPF, ou outros identificadores.
 */
export function anonymizedDemographics(paciente: {
  dataNascimento?: Date | string | null;
  sexo?: string | null;
}): string {
  const age = calculateAge(paciente.dataNascimento ?? null);
  const sexo = paciente.sexo || "Não informado";
  return `Paciente, ${age ? `${age} anos` : "idade não informada"}, sexo: ${sexo}`;
}
