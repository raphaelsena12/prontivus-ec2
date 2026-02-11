-- AlterTable
ALTER TABLE "consultas" ADD COLUMN     "procedimentoId" TEXT;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "procedimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
