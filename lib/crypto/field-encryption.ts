/**
 * Field-Level Encryption (FLE) para dados sensíveis LGPD
 *
 * Campos criptografados ficam no formato:
 *   enc_v1:<iv_base64>:<ciphertext_base64>:<tag_base64>
 *
 * Campos sem o prefixo "enc_v1:" são tratados como plaintext,
 * permitindo migração gradual e rollback seguro.
 *
 * Algoritmo: AES-256-GCM (authenticated encryption)
 */
import * as crypto from "crypto";

const ENC_PREFIX = "enc_v1:";

// ---------- Configuração dos campos por modelo ----------

export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Paciente: ["rg", "nomeMae", "nomePai", "endereco", "complemento", "bairro"],
  Prontuario: [
    "anamnese",
    "exameFisico",
    "conduta",
    "orientacoesConduta",
    "orientacoes",
    "evolucao",
  ],
  Consulta: ["observacoes"],
  PrescricaoMedicamento: ["posologia", "observacoes"],
  SolicitacaoExame: ["resultado", "observacoes"],
};

// ---------- Chave ----------

let _keyCache: Buffer | null = null;

function getFieldEncryptionKey(): Buffer {
  if (_keyCache) return _keyCache;

  const keyB64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY não configurada. Gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY inválida. Esperado 32 bytes em Base64, recebido ${key.length}.`
    );
  }
  _keyCache = key;
  return key;
}

// ---------- Encrypt / Decrypt unitários ----------

export function encryptField(plaintext: string): string {
  const key = getFieldEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    // Plaintext legado — retorna como está (permite migração gradual)
    return stored;
  }

  const key = getFieldEncryptionKey();
  const parts = stored.slice(ENC_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Payload criptográfico corrompido (formato inválido).");
  }

  const [ivB64, ciphertextB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

// ---------- Helpers para objetos ----------

/**
 * Criptografa os campos configurados de um objeto (para escrita no banco).
 * Campos null/undefined são ignorados.
 */
export function encryptFields(
  model: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && !isEncrypted(value)) {
      result[field] = encryptField(value);
    }
  }
  return result;
}

/**
 * Decriptografa os campos configurados de um objeto (após leitura do banco).
 * Valores plaintext (sem prefixo enc_v1:) são retornados como estão.
 */
export function decryptFields(
  model: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
      try {
        result[field] = decryptField(value);
      } catch {
        console.error(
          `[FLE] Falha ao decriptar ${model}.${field}. Retornando valor bruto.`
        );
      }
    }
  }
  return result;
}
