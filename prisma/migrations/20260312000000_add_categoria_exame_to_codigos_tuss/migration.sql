-- AlterTable
-- Adiciona campo categoriaExame como nullable (só usado quando tipoProcedimento = 'EXAME')
ALTER TABLE "codigos_tuss" ADD COLUMN "categoriaExame" TEXT;

-- CreateIndex
CREATE INDEX "codigos_tuss_categoriaExame_idx" ON "codigos_tuss"("categoriaExame");
