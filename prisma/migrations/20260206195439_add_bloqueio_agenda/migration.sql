-- CreateTable
CREATE TABLE "bloqueios_agenda" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "horaFim" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bloqueios_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bloqueios_agenda_clinicaId_idx" ON "bloqueios_agenda"("clinicaId");

-- CreateIndex
CREATE INDEX "bloqueios_agenda_medicoId_idx" ON "bloqueios_agenda"("medicoId");

-- CreateIndex
CREATE INDEX "bloqueios_agenda_dataInicio_dataFim_idx" ON "bloqueios_agenda"("dataInicio", "dataFim");

-- AddForeignKey
ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
