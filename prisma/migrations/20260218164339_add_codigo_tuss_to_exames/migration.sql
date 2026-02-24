-- AlterTable
-- Adiciona campo codigoTussId como nullable para manter dados existentes
ALTER TABLE "exames" ADD COLUMN "codigoTussId" TEXT;

-- CreateIndex
CREATE INDEX "exames_codigoTussId_idx" ON "exames"("codigoTussId");

-- AddForeignKey
-- Adiciona foreign key com ON DELETE SET NULL para não quebrar dados existentes
ALTER TABLE "exames" ADD CONSTRAINT "exames_codigoTussId_fkey" FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id") ON DELETE SET NULL ON UPDATE CASCADE;
