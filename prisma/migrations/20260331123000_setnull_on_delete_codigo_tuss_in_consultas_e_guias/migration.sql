-- Make FK references to CodigoTuss non-blocking by setting them to NULL on delete.
-- This prevents deleting CodigoTuss from cascading/deleting Consultas and Guias,
-- while still allowing the delete to succeed.

-- 1) CONSULTAS: codigoTussId becomes nullable + FK ON DELETE SET NULL
ALTER TABLE "consultas" ALTER COLUMN "codigoTussId" DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consultas_codigoTussId_fkey'
  ) THEN
    ALTER TABLE "consultas" DROP CONSTRAINT "consultas_codigoTussId_fkey";
  END IF;
END $$;

ALTER TABLE "consultas"
  ADD CONSTRAINT "consultas_codigoTussId_fkey"
  FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) GUIAS TISS PROCEDIMENTOS: codigoTussId becomes nullable + FK ON DELETE SET NULL
ALTER TABLE "guias_tiss_procedimentos" ALTER COLUMN "codigoTussId" DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guias_tiss_procedimentos_codigoTussId_fkey'
  ) THEN
    ALTER TABLE "guias_tiss_procedimentos" DROP CONSTRAINT "guias_tiss_procedimentos_codigoTussId_fkey";
  END IF;
END $$;

ALTER TABLE "guias_tiss_procedimentos"
  ADD CONSTRAINT "guias_tiss_procedimentos_codigoTussId_fkey"
  FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

