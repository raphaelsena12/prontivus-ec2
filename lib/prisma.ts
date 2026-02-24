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

// Em desenvolvimento, forçar limpeza do cache se PRISMA_FORCE_RELOAD estiver definido
// Isso é útil após mudanças no schema do Prisma
// Também limpar cache após mudanças no schema (útil para desenvolvimento)
if (process.env.NODE_ENV !== "production") {
  if (process.env.PRISMA_FORCE_RELOAD === "true" || process.env.NEXT_PHASE === "phase-development-server") {
    if (globalForPrisma.prisma) {
      try {
        (globalForPrisma.prisma as any).$disconnect?.();
      } catch (e) {
        // Ignorar erros
      }
      globalForPrisma.prisma = undefined;
    }
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
