import { PrismaClient } from "@/lib/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necessário para RDS AWS com certificado autoassinado
});

const adapter = new PrismaPg(pool);

// Verificar se o client em cache tem o modelo BloqueioAgenda
// Se não tiver, limpar o cache para forçar recriação
if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  if (!('bloqueioAgenda' in globalForPrisma.prisma)) {
    // Limpar cache antigo
    try {
      (globalForPrisma.prisma as any).$disconnect?.();
    } catch (e) {
      // Ignorar erros
    }
    globalForPrisma.prisma = undefined;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
