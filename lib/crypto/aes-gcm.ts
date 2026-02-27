import crypto from "crypto";

type EncryptedPayload = {
  alg: "aes-256-gcm";
  ivB64: string;
  tagB64: string;
  ciphertextB64: string;
};

function getKey(): Buffer {
  const keyB64 = process.env.PFX_PASSWORD_ENC_KEY;
  if (!keyB64) {
    throw new Error(
      "PFX_PASSWORD_ENC_KEY não configurada. Defina uma chave de 32 bytes em Base64."
    );
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `PFX_PASSWORD_ENC_KEY inválida. Esperado 32 bytes após Base64, recebido ${key.length}.`
    );
  }
  return key;
}

export function encryptStringAESGCM(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recomendado p/ GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plainText, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    alg: "aes-256-gcm",
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    ciphertextB64: ciphertext.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptStringAESGCM(payloadStr: string): string {
  const key = getKey();
  const payload = JSON.parse(payloadStr) as EncryptedPayload;
  if (payload.alg !== "aes-256-gcm") {
    throw new Error("Payload criptográfico inválido (algoritmo).");
  }

  const iv = Buffer.from(payload.ivB64, "base64");
  const tag = Buffer.from(payload.tagB64, "base64");
  const ciphertext = Buffer.from(payload.ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

