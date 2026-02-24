-- AlterTable
-- Adiciona campos inicioAtendimento e fimAtendimento como nullable para registrar os momentos exatos do início e fim do atendimento
ALTER TABLE "consultas" ADD COLUMN "inicioAtendimento" TIMESTAMP(3);
ALTER TABLE "consultas" ADD COLUMN "fimAtendimento" TIMESTAMP(3);
