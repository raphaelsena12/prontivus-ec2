-- CreateTable
CREATE TABLE "mensagens_medico_secretaria" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "enviadoPorMedico" BOOLEAN NOT NULL DEFAULT true,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dataLeitura" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_medico_secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensagens_medico_secretaria_clinicaId_idx" ON "mensagens_medico_secretaria"("clinicaId");

-- CreateIndex
CREATE INDEX "mensagens_medico_secretaria_medicoId_idx" ON "mensagens_medico_secretaria"("medicoId");

-- CreateIndex
CREATE INDEX "mensagens_medico_secretaria_secretariaId_idx" ON "mensagens_medico_secretaria"("secretariaId");

-- CreateIndex
CREATE INDEX "mensagens_medico_secretaria_createdAt_idx" ON "mensagens_medico_secretaria"("createdAt");

-- AddForeignKey
ALTER TABLE "mensagens_medico_secretaria" ADD CONSTRAINT "mensagens_medico_secretaria_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_medico_secretaria" ADD CONSTRAINT "mensagens_medico_secretaria_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_medico_secretaria" ADD CONSTRAINT "mensagens_medico_secretaria_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
