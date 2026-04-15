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
 *
 * Blind Index:
 *   Para campos que precisam de busca (CPF, email, telefone), usamos
 *   HMAC-SHA256 com chave separada (BLIND_INDEX_KEY). O hash é armazenado
 *   em campos auxiliares (*Hash) e os índices são criados sobre eles.
 *   Isso permite busca exata sem expor o valor em plaintext.
 */
import * as crypto from "crypto";

const ENC_PREFIX = "enc_v1:";

// ---------- Configuração dos campos por modelo ----------

export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Paciente: [
    "cpf",
    "rg",
    "email",
    "telefone",
    "celular",
    "cep",
    "endereco",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "estado",
    "nomeMae",
    "nomePai",
    "cns",
    "numeroCarteirinha",
  ],
  Usuario: [
    "cpf",
    "email",
    "telefone",
  ],
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

/**
 * Campos que precisam de blind index para busca.
 * Mapa: modelo -> { campoOriginal -> campoHash }
 */
export const BLIND_INDEX_FIELDS: Record<string, Record<string, string>> = {
  Paciente: {
    cpf: "cpfHash",
    email: "emailHash",
    telefone: "telefoneHash",
    celular: "celularHash",
  },
  Usuario: {
    cpf: "cpfHash",
    email: "emailHash",
    telefone: "telefoneHash",
  },
};

// ---------- Chaves ----------

let _encKeyCache: Buffer | null = null;
let _blindKeyCache: Buffer | null = null;

function getFieldEncryptionKey(): Buffer {
  if (_encKeyCache) return _encKeyCache;

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
  _encKeyCache = key;
  return key;
}

function getBlindIndexKey(): Buffer {
  if (_blindKeyCache) return _blindKeyCache;

  // Usa BLIND_INDEX_KEY se disponível, senão deriva da FIELD_ENCRYPTION_KEY
  const keyB64 = process.env.BLIND_INDEX_KEY || process.env.FIELD_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error("BLIND_INDEX_KEY ou FIELD_ENCRYPTION_KEY não configurada.");
  }
  const raw = Buffer.from(keyB64, "base64");
  // Deriva uma chave separada para blind index via SHA256(key || label)
  _blindKeyCache = crypto
    .createHash("sha256")
    .update(raw)
    .update("blind-index-v1")
    .digest();
  return _blindKeyCache;
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

// ---------- Blind Index ----------

/**
 * Gera um HMAC-SHA256 determinístico de um valor normalizado.
 * Usado para criar blind indexes que permitem busca exata sem expor o plaintext.
 *
 * Normalização: lowercase + remove espaços extras + remove pontuação (para CPF/telefone)
 */
export function blindIndex(value: string): string {
  const key = getBlindIndexKey();
  // Normaliza: lowercase, sem espaços, sem pontuação (para CPF/telefone ficarem uniformes)
  const normalized = value.toLowerCase().replace(/[\s.\-\/()]/g, "");
  return crypto.createHmac("sha256", key).update(normalized, "utf8").digest("hex");
}

/**
 * Gera o blind index de um valor para uso em queries de busca.
 * Retorna null se o valor for vazio/nulo.
 */
export function blindIndexOrNull(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  // Se já estiver criptografado, não pode gerar blind index (dados legados sem hash)
  if (isEncrypted(value)) return null;
  return blindIndex(value);
}

// ---------- Helpers para objetos ----------

/**
 * Criptografa os campos configurados de um objeto (para escrita no banco).
 * Também gera blind indexes para os campos configurados em BLIND_INDEX_FIELDS.
 * Campos null/undefined são ignorados.
 */
export function encryptFields(
  model: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  const blindFields = BLIND_INDEX_FIELDS[model] || {};

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && !isEncrypted(value)) {
      // Gerar blind index antes de criptografar
      const hashField = blindFields[field];
      if (hashField && !(hashField in result)) {
        result[hashField] = blindIndex(value);
      }
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
