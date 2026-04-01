-- AlterTable
ALTER TABLE "medicos_especialidades" ADD COLUMN IF NOT EXISTS "categoriaId" TEXT;
ALTER TABLE "medicos_especialidades" ADD COLUMN IF NOT EXISTS "rqe" TEXT;

-- DropIndex (old unique)
DROP INDEX IF EXISTS "medicos_especialidades_medicoId_especialidadeId_key";

-- CreateIndex (new unique)
CREATE UNIQUE INDEX IF NOT EXISTS "medicos_especialidades_medicoId_especialidadeId_categoriaId_key"
ON "medicos_especialidades"("medicoId", "especialidadeId", "categoriaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "medicos_especialidades_categoriaId_idx" ON "medicos_especialidades"("categoriaId");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "medicos_especialidades"
  ADD CONSTRAINT "medicos_especialidades_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "especialidades_categorias"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

