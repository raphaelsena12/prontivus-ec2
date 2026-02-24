-- CreateTable
CREATE TABLE "listas_espera" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "observacoes" TEXT,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_espera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listas_espera_clinicaId_idx" ON "listas_espera"("clinicaId");

-- CreateIndex
CREATE INDEX "listas_espera_medicoId_idx" ON "listas_espera"("medicoId");

-- CreateIndex
CREATE INDEX "listas_espera_pacienteId_idx" ON "listas_espera"("pacienteId");

-- CreateIndex
CREATE INDEX "listas_espera_prioridade_idx" ON "listas_espera"("prioridade");

-- CreateIndex
CREATE INDEX "listas_espera_createdAt_idx" ON "listas_espera"("createdAt");

-- AddForeignKey
ALTER TABLE "listas_espera" ADD CONSTRAINT "listas_espera_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_espera" ADD CONSTRAINT "listas_espera_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_espera" ADD CONSTRAINT "listas_espera_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

