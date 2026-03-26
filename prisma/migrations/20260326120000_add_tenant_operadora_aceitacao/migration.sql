-- Add TenantOperadora (aceitação de operadoras por clínica) e permitir Operadora global (clinicaId NULL)

-- 1) Operadoras: clinicaId passa a ser opcional (catálogo global), e adiciona campos de endereço
ALTER TABLE "operadoras"
  ALTER COLUMN "clinicaId" DROP NOT NULL;

ALTER TABLE "operadoras"
  ADD COLUMN IF NOT EXISTS "cep" TEXT,
  ADD COLUMN IF NOT EXISTS "endereco" TEXT,
  ADD COLUMN IF NOT EXISTS "numero" TEXT,
  ADD COLUMN IF NOT EXISTS "complemento" TEXT,
  ADD COLUMN IF NOT EXISTS "bairro" TEXT,
  ADD COLUMN IF NOT EXISTS "cidade" TEXT,
  ADD COLUMN IF NOT EXISTS "estado" TEXT,
  ADD COLUMN IF NOT EXISTS "pais" TEXT DEFAULT 'Brasil';

-- 2) Tabela de vínculo tenant <-> operadora (aceitação)
CREATE TABLE IF NOT EXISTS "tenants_operadoras" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "tenantId" TEXT NOT NULL,
  "operadoraId" TEXT NOT NULL,
  "aceita" BOOLEAN NOT NULL DEFAULT TRUE,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_operadoras_pkey" PRIMARY KEY ("id")
);

-- Unicidade por tenant/operadora
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_operadoras_tenantId_operadoraId_key"
  ON "tenants_operadoras" ("tenantId", "operadoraId");

CREATE INDEX IF NOT EXISTS "tenants_operadoras_tenantId_idx"
  ON "tenants_operadoras" ("tenantId");

CREATE INDEX IF NOT EXISTS "tenants_operadoras_operadoraId_idx"
  ON "tenants_operadoras" ("operadoraId");

CREATE INDEX IF NOT EXISTS "tenants_operadoras_aceita_idx"
  ON "tenants_operadoras" ("aceita");

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_operadoras_tenantId_fkey'
  ) THEN
    ALTER TABLE "tenants_operadoras"
      ADD CONSTRAINT "tenants_operadoras_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_operadoras_operadoraId_fkey'
  ) THEN
    ALTER TABLE "tenants_operadoras"
      ADD CONSTRAINT "tenants_operadoras_operadoraId_fkey"
      FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Seed de vínculos para operadoras já existentes por clínica:
-- Para cada operadora que já tinha clinicaId, cria o vínculo tenant-operadora aceito = true.
INSERT INTO "tenants_operadoras" ("tenantId", "operadoraId", "aceita", "createdAt", "updatedAt")
SELECT o."clinicaId", o."id", TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "operadoras" o
WHERE o."clinicaId" IS NOT NULL
ON CONFLICT ("tenantId", "operadoraId") DO NOTHING;

