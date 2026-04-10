-- Tornar ufCrm e codigoCbo NOT NULL com default vazio
-- (dados existentes com NULL serão convertidos para string vazia)

-- Backfill: converter NULLs para string vazia
UPDATE "medicos" SET "ufCrm" = '' WHERE "ufCrm" IS NULL;
UPDATE "medicos" SET "codigoCbo" = '' WHERE "codigoCbo" IS NULL;

-- Alterar colunas para NOT NULL com default
ALTER TABLE "medicos" ALTER COLUMN "ufCrm" SET NOT NULL;
ALTER TABLE "medicos" ALTER COLUMN "ufCrm" SET DEFAULT '';
ALTER TABLE "medicos" ALTER COLUMN "codigoCbo" SET NOT NULL;
ALTER TABLE "medicos" ALTER COLUMN "codigoCbo" SET DEFAULT '';
