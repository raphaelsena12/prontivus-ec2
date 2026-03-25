-- AlterTable: Tornar numeroProntuario único globalmente
-- Atenção: alguns ambientes antigos não possuem a coluna "numeroProntuario" nesta altura da linha do tempo.
-- Para manter a cadeia de migrations aplicável no shadow database (e em bases legacy),
-- só executamos as alterações se a coluna existir.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pacientes'
      AND column_name = 'numeroProntuario'
  ) THEN
    -- Primeiro, remover a constraint única composta (clinicaId, numeroProntuario)
    EXECUTE 'ALTER TABLE "pacientes" DROP CONSTRAINT IF EXISTS "pacientes_clinicaId_numeroProntuario_key"';

    -- Adicionar índice único global no campo numeroProntuario (ignorando NULL)
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "pacientes_numeroProntuario_key" ON "pacientes"("numeroProntuario") WHERE "numeroProntuario" IS NOT NULL';

    -- Índice auxiliar (performance)
    EXECUTE 'CREATE INDEX IF NOT EXISTS "pacientes_numeroProntuario_idx" ON "pacientes"("numeroProntuario")';
  END IF;
END $$;

