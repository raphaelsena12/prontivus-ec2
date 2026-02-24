-- AlterTable: Tornar numeroProntuario único globalmente
-- Primeiro, remover a constraint única composta (clinicaId, numeroProntuario)
ALTER TABLE "pacientes" DROP CONSTRAINT IF EXISTS "pacientes_clinicaId_numeroProntuario_key";

-- Adicionar índice único global no campo numeroProntuario
-- Nota: O Prisma já adiciona @unique no schema, mas precisamos garantir que não há duplicados antes
-- Execute o script fix-duplicate-prontuarios.ts antes de aplicar esta migration

-- Adicionar constraint única global
CREATE UNIQUE INDEX IF NOT EXISTS "pacientes_numeroProntuario_key" ON "pacientes"("numeroProntuario") WHERE "numeroProntuario" IS NOT NULL;

-- Adicionar índice para melhor performance (se ainda não existir)
CREATE INDEX IF NOT EXISTS "pacientes_numeroProntuario_idx" ON "pacientes"("numeroProntuario");

