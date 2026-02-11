-- CreateTable
CREATE TABLE "manipulados" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "informacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manipulados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manipulados_clinicaId_idx" ON "manipulados"("clinicaId");

-- CreateIndex
CREATE INDEX "manipulados_medicoId_idx" ON "manipulados"("medicoId");

-- CreateIndex
CREATE INDEX "manipulados_descricao_idx" ON "manipulados"("descricao");

-- AddForeignKey
ALTER TABLE "manipulados" ADD CONSTRAINT "manipulados_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manipulados" ADD CONSTRAINT "manipulados_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
