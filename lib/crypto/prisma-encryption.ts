/**
 * Prisma Extension para criptografia automática de campos sensíveis.
 *
 * Intercepta operações de leitura e escrita nos modelos configurados,
 * criptografando ao salvar e decriptando ao ler, de forma transparente
 * para o restante da aplicação.
 */
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  ENCRYPTED_FIELDS,
  encryptField,
  decryptField,
  isEncrypted,
} from "./field-encryption";

// ---------- Helpers internos ----------

function encryptDataFields(model: string, data: any): any {
  if (!data || typeof data !== "object") return data;
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

function decryptRecord(model: string, record: any): any {
  if (!record || typeof record !== "object") return record;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return record;

  const result = { ...record };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0) {
      try {
        result[field] = decryptField(value);
      } catch {
        // Se falhar decrypt, retorna o valor original (pode ser plaintext legado)
      }
    }
  }
  return result;
}

function decryptResults(model: string, result: any): any {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((r) => decryptRecord(model, r));
  }
  return decryptRecord(model, result);
}

// ---------- Extensão Prisma ----------

const MODELS_WITH_ENCRYPTION = Object.keys(ENCRYPTED_FIELDS);

// Operações de escrita que precisam criptografar
const WRITE_OPS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
] as const;

// Operações de leitura que precisam decriptar
const READ_OPS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
] as const;

/**
 * Aplica a camada de criptografia a um PrismaClient.
 *
 * Uso:
 *   const prisma = applyFieldEncryption(new PrismaClient());
 *
 * Compatível com qualquer PrismaClient (com ou sem adapter).
 */
export function applyFieldEncryption<T extends PrismaClient>(client: T): T {
  // Verificar se a chave está configurada — se não, retorna client sem criptografia
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    console.warn(
      "[FLE] FIELD_ENCRYPTION_KEY não configurada. Criptografia de campos DESATIVADA."
    );
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !MODELS_WITH_ENCRYPTION.includes(model)) {
            return query(args);
          }

          // Cast para any — necessário porque o union type de $allOperations
          // não garante .data/.create/.update em todas as operações
          const a = args as any;

          // --- ESCRITA: criptografar antes de salvar ---
          if (WRITE_OPS.includes(operation as any)) {
            if (operation === "upsert") {
              if (a.create) {
                a.create = encryptDataFields(model, a.create);
              }
              if (a.update) {
                a.update = encryptDataFields(model, a.update);
              }
            } else if (operation === "createMany" && a.data) {
              if (Array.isArray(a.data)) {
                a.data = a.data.map((d: any) =>
                  encryptDataFields(model, d)
                );
              }
            } else if (a.data) {
              a.data = encryptDataFields(model, a.data);
            }
          }

          // Executar a query original
          const result = await query(args);

          // --- LEITURA: decriptar depois de ler ---
          if (READ_OPS.includes(operation as any)) {
            return decryptResults(model, result);
          }

          // Para create/update, o Prisma retorna o registro — decriptar também
          if (
            WRITE_OPS.includes(operation as any) &&
            operation !== "createMany" &&
            operation !== "updateMany"
          ) {
            return decryptResults(model, result);
          }

          return result;
        },
      },
    },
  }) as unknown as T;
}
