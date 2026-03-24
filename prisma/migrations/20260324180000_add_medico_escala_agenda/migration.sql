-- CreateTable
CREATE TABLE "medicos_escalas_agenda" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_escalas_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos_escalas_agenda_excecoes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_escalas_agenda_excecoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicos_escalas_agenda_clinicaId_medicoId_diaSemana_idx" ON "medicos_escalas_agenda"("clinicaId", "medicoId", "diaSemana");

-- CreateIndex
CREATE INDEX "medicos_escalas_agenda_medicoId_ativo_idx" ON "medicos_escalas_agenda"("medicoId", "ativo");

-- CreateIndex
CREATE INDEX "medicos_escalas_agenda_excecoes_clinicaId_medicoId_data_idx" ON "medicos_escalas_agenda_excecoes"("clinicaId", "medicoId", "data");

-- CreateIndex
CREATE INDEX "medicos_escalas_agenda_excecoes_medicoId_data_idx" ON "medicos_escalas_agenda_excecoes"("medicoId", "data");

-- AddForeignKey
ALTER TABLE "medicos_escalas_agenda" ADD CONSTRAINT "medicos_escalas_agenda_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_escalas_agenda" ADD CONSTRAINT "medicos_escalas_agenda_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_escalas_agenda_excecoes" ADD CONSTRAINT "medicos_escalas_agenda_excecoes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_escalas_agenda_excecoes" ADD CONSTRAINT "medicos_escalas_agenda_excecoes_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
