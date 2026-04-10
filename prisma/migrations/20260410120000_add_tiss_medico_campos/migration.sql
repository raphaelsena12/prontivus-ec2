-- AlterTable: adicionar campos TISS obrigatórios na guias_tiss
ALTER TABLE "guias_tiss" ADD COLUMN IF NOT EXISTS "medicoId" TEXT;
ALTER TABLE "guias_tiss" ADD COLUMN IF NOT EXISTS "indicacaoAcidente" TEXT NOT NULL DEFAULT '9';
ALTER TABLE "guias_tiss" ADD COLUMN IF NOT EXISTS "tipoConsulta" TEXT NOT NULL DEFAULT '1';
ALTER TABLE "guias_tiss" ADD COLUMN IF NOT EXISTS "regimeAtendimento" TEXT NOT NULL DEFAULT '01';
ALTER TABLE "guias_tiss" ADD COLUMN IF NOT EXISTS "caraterAtendimento" TEXT NOT NULL DEFAULT '1';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "guias_tiss_medicoId_idx" ON "guias_tiss"("medicoId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guias_tiss_medicoId_fkey'
  ) THEN
    ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_medicoId_fkey"
      FOREIGN KEY ("medicoId") REFERENCES "medicos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: preencher medicoId a partir da consulta vinculada (quando existir)
UPDATE "guias_tiss" gt
SET "medicoId" = c."medicoId"
FROM "consultas" c
WHERE gt."consultaId" = c."id"
  AND gt."medicoId" IS NULL;
