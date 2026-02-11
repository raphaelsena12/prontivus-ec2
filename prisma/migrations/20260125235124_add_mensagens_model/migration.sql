-- CreateTable
CREATE TABLE "mensagens" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "enviadoPorMedico" BOOLEAN NOT NULL DEFAULT true,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dataLeitura" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensagens_clinicaId_idx" ON "mensagens"("clinicaId");

-- CreateIndex
CREATE INDEX "mensagens_medicoId_idx" ON "mensagens"("medicoId");

-- CreateIndex
CREATE INDEX "mensagens_pacienteId_idx" ON "mensagens"("pacienteId");

-- CreateIndex
CREATE INDEX "mensagens_createdAt_idx" ON "mensagens"("createdAt");

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
