/**
 * Prisma Extension para criptografia automática de campos sensíveis.
 *
 * Intercepta operações de leitura e escrita nos modelos configurados,
 * criptografando ao salvar e decriptando ao ler, de forma transparente
 * para o restante da aplicação.
 *
 * Também gera blind indexes (*Hash) automaticamente ao salvar campos
 * que precisam de busca (CPF, email, telefone, celular).
 */
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  ENCRYPTED_FIELDS,
  BLIND_INDEX_FIELDS,
  encryptField,
  decryptField,
  isEncrypted,
  blindIndex,
} from "./field-encryption";

// ---------- Helpers internos ----------

function encryptDataFields(model: string, data: any): any {
  if (!data || typeof data !== "object") return data;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  // Spread seguro: preserva instâncias de Decimal, Date e outros objetos especiais
  const result: any = {};
  for (const key of Object.keys(data)) {
    result[key] = data[key];
  }
  const blindFields = BLIND_INDEX_FIELDS[model] || {};

  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && !isEncrypted(value)) {
      // Gerar blind index antes de criptografar (somente se não foi fornecido explicitamente)
      const hashField = blindFields[field];
      if (hashField && !(hashField in result)) {
        result[hashField] = blindIndex(value);
      }
      result[field] = encryptField(value);
    }
  }
  return result;
}

function decryptRecord(model: string, record: any): any {
  if (!record || typeof record !== "object") return record;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return record;

  // Spread seguro: preserva instâncias de Decimal, Date e outros objetos especiais
  const result: any = {};
  for (const key of Object.keys(record)) {
    result[key] = record[key];
  }

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

/**
 * Percorre recursivamente um registro e decripta campos de relações aninhadas.
 * Isso é necessário porque o Prisma $extends intercepta apenas o modelo principal,
 * mas relações incluídas (include/select) podem conter campos criptografados.
 */
function decryptNestedRelations(record: any): any {
  if (!record || typeof record !== "object") return record;
  if (Array.isArray(record)) {
    return record.map((r) => decryptNestedRelations(r));
  }

  // Spread seguro: preserva instâncias de Decimal, Date e outros objetos especiais
  const result: any = {};
  for (const key of Object.keys(record)) {
    result[key] = record[key];
  }

  for (const key of Object.keys(result)) {
    const value = result[key];
    if (Array.isArray(value)) {
      // Verificar se os itens do array correspondem a um modelo criptografado
      const relModel = findModelForRelation(key);
      if (relModel) {
        result[key] = value.map((item: any) => {
          const decrypted = decryptRecord(relModel, item);
          return decryptNestedRelations(decrypted);
        });
      } else {
        result[key] = value.map((item: any) => decryptNestedRelations(item));
      }
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      const relModel = findModelForRelation(key);
      if (relModel) {
        result[key] = decryptNestedRelations(decryptRecord(relModel, value));
      } else {
        result[key] = decryptNestedRelations(value);
      }
    }
  }

  return result;
}

// Mapa de nomes de relação (no Prisma) → nome do modelo
const RELATION_TO_MODEL: Record<string, string> = {
  prontuarios: "Prontuario",
  prontuario: "Prontuario",
  paciente: "Paciente",
  pacientes: "Paciente",
  consulta: "Consulta",
  consultas: "Consulta",
  usuario: "Usuario",
  usuarios: "Usuario",
  prescricaoMedicamentos: "PrescricaoMedicamento",
  prescricaoMedicamento: "PrescricaoMedicamento",
  consultaPrescricoes: "PrescricaoMedicamento",
  solicitacaoExames: "SolicitacaoExame",
  solicitacaoExame: "SolicitacaoExame",
  consultaExames: "SolicitacaoExame",
};

function findModelForRelation(relationName: string): string | undefined {
  return RELATION_TO_MODEL[relationName];
}

function decryptResults(model: string, result: any): any {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((r) => decryptNestedRelations(decryptRecord(model, r)));
  }
  return decryptNestedRelations(decryptRecord(model, result));
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
          const modelName = model as string | undefined;
          if (!modelName) {
            return query(args);
          }

          const modelHasEncryption = MODELS_WITH_ENCRYPTION.includes(modelName);

          // Cast para any — necessário porque o union type de $allOperations
          // não garante .data/.create/.update em todas as operações
          const a = args as any;

          // --- ESCRITA: criptografar antes de salvar ---
          if (modelHasEncryption && WRITE_OPS.includes(operation as any)) {
            if (operation === "upsert") {
              if (a.create) {
                a.create = encryptDataFields(modelName, a.create);
              }
              if (a.update) {
                a.update = encryptDataFields(modelName, a.update);
              }
            } else if (operation === "createMany" && a.data) {
              if (Array.isArray(a.data)) {
                a.data = a.data.map((d: any) =>
                  encryptDataFields(modelName, d)
                );
              }
            } else if (a.data) {
              a.data = encryptDataFields(modelName, a.data);
            }
          }

          // Executar a query original
          const result = await query(args);

          // --- LEITURA: decriptar depois de ler (modelo principal + relações) ---
          if (READ_OPS.includes(operation as any)) {
            if (modelHasEncryption) {
              return decryptResults(modelName, result);
            }
            // Mesmo que o modelo principal não tenha criptografia,
            // relações aninhadas podem ter — decriptar recursivamente
            if (result === null || result === undefined) return result;
            if (Array.isArray(result)) {
              return result.map((r: any) => decryptNestedRelations(r));
            }
            return decryptNestedRelations(result);
          }

          // Para create/update, o Prisma retorna o registro — decriptar também
          if (
            WRITE_OPS.includes(operation as any) &&
            operation !== "createMany" &&
            operation !== "updateMany"
          ) {
            if (modelHasEncryption) {
              return decryptResults(modelName, result);
            }
            return decryptNestedRelations(result);
          }

          return result;
        },
      },
    },
  }) as unknown as T;
}
