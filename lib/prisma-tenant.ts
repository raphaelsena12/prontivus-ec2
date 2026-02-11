import { PrismaClient } from "@/lib/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Cache de clients por clinicaId para evitar criar múltiplos clients
const clientCache = new Map<string, PrismaClient>();
let adminClient: PrismaClient | null = null;

// Pool compartilhado para todos os clients
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necessário para RDS AWS com certificado autoassinado
});

// Modelos que precisam de filtro por clinicaId
const TENANT_AWARE_MODELS = ["Usuario"] as const;

type TenantAwareModel = (typeof TENANT_AWARE_MODELS)[number];

// Helper para adicionar filtro de clinicaId em queries
function addTenantFilter(args: any, clinicaId: string, operation: string): any {
  if (!args) return { where: { clinicaId } };

  // Para operações de leitura (findMany, findUnique, etc)
  if (operation.startsWith("find") || operation === "count") {
    if (args.where) {
      if (args.where.clinicaId !== undefined) {
        if (args.where.clinicaId !== clinicaId) {
          throw new Error(
            "Acesso negado: tentativa de acessar dados de outra clínica"
          );
        }
      } else {
        args.where.clinicaId = clinicaId;
      }
    } else {
      args.where = { clinicaId };
    }
  }

  // Para operações de criação
  if (operation === "create" || operation === "createMany") {
    if (args.data) {
      const dataArray = Array.isArray(args.data) ? args.data : [args.data];
      dataArray.forEach((item: any) => {
        if (item.clinicaId !== undefined && item.clinicaId !== clinicaId) {
          throw new Error(
            "Acesso negado: tentativa de criar registro para outra clínica"
          );
        }
        item.clinicaId = clinicaId;
      });
    }
  }

  // Para operações de atualização
  if (operation.startsWith("update")) {
    if (args.where) {
      if (args.where.clinicaId !== undefined) {
        if (args.where.clinicaId !== clinicaId) {
          throw new Error(
            "Acesso negado: tentativa de atualizar registro de outra clínica"
          );
        }
      } else {
        args.where.clinicaId = clinicaId;
      }
    } else {
      args.where = { clinicaId };
    }
    if (args.data?.clinicaId !== undefined) {
      delete args.data.clinicaId; // Não permitir alterar clinicaId
    }
  }

  // Para operações de exclusão
  if (operation.startsWith("delete")) {
    if (args.where) {
      if (args.where.clinicaId !== undefined) {
        if (args.where.clinicaId !== clinicaId) {
          throw new Error(
            "Acesso negado: tentativa de deletar registro de outra clínica"
          );
        }
      } else {
        args.where.clinicaId = clinicaId;
      }
    } else {
      args.where = { clinicaId };
    }
  }

  return args;
}

/**
 * Cria um Prisma Client com middleware que adiciona filtro automático por clinicaId
 * Garante que queries sempre filtrem por clinicaId, prevenindo vazamento de dados entre clínicas
 *
 * @param clinicaId - ID da clínica para filtrar queries. Se não fornecido, retorna client sem filtros
 * @returns PrismaClient configurado com middleware de segurança
 */
export function getPrismaClient(clinicaId?: string): PrismaClient {
  // Se não fornecido clinicaId, retornar client sem filtros (usar com cuidado!)
  if (!clinicaId) {
    console.warn(
      "getPrismaClient chamado sem clinicaId. Use getPrismaAdminClient() para Super Admin."
    );
    return getPrismaAdminClient();
  }

  // Retornar client do cache se já existe
  if (clientCache.has(clinicaId)) {
    return clientCache.get(clinicaId)!;
  }

  // Criar novo client com adapter
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Criar proxy para interceptar chamadas e adicionar filtro de clinicaId
  const proxiedClient = new Proxy(client, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];

      // Interceptar apenas modelos que precisam de filtro
      if (
        typeof prop === "string" &&
        TENANT_AWARE_MODELS.includes(prop as TenantAwareModel)
      ) {
        return new Proxy(original as any, {
          get(modelTarget, operation) {
            const originalOperation =
              modelTarget[operation as keyof typeof modelTarget];
            if (typeof originalOperation === "function") {
              return function (args: any) {
                const filteredArgs = addTenantFilter(
                  args,
                  clinicaId,
                  operation as string
                );
                return originalOperation.call(modelTarget, filteredArgs);
              };
            }
            return originalOperation;
          },
        });
      }

      return original;
    },
  });

  // Armazenar no cache
  clientCache.set(clinicaId, proxiedClient as PrismaClient);

  return proxiedClient as PrismaClient;
}

/**
 * Retorna um Prisma Client sem filtros de tenant
 * Use APENAS para Super Admin ou operações administrativas
 *
 * @returns PrismaClient sem middleware de filtro
 */
export function getPrismaAdminClient(): PrismaClient {
  if (adminClient) {
    return adminClient;
  }

  const adapter = new PrismaPg(pool);
  adminClient = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return adminClient;
}

/**
 * Limpa o cache de clients
 * Útil para testes ou quando necessário recriar clients
 */
export function clearPrismaClientCache() {
  clientCache.clear();
  adminClient = null;
}

/**
 * Exemplos de uso:
 *
 * // Para usuários normais (sempre passar clinicaId)
 * const prisma = getPrismaClient(user.clinicaId);
 * const usuarios = await prisma.usuario.findMany(); // Automaticamente filtra por clinicaId
 *
 * // Para Super Admin (sem filtros)
 * const prisma = getPrismaAdminClient();
 * const todasClinicas = await prisma.tenant.findMany(); // Acessa todas as clínicas
 *
 * // Tentativa de vazamento de dados será bloqueada
 * const prisma = getPrismaClient("clinica-1");
 * await prisma.usuario.findMany({ where: { clinicaId: "clinica-2" } }); // Erro!
 */
