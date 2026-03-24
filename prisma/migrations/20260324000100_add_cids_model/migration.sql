-- CreateTable
CREATE TABLE "cids" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cids_clinicaId_codigo_key" ON "cids"("clinicaId", "codigo");

-- CreateIndex
CREATE INDEX "cids_clinicaId_idx" ON "cids"("clinicaId");

-- CreateIndex
CREATE INDEX "cids_codigo_idx" ON "cids"("codigo");

-- CreateIndex
CREATE INDEX "cids_descricao_idx" ON "cids"("descricao");

-- CreateIndex
CREATE INDEX "cids_ativo_idx" ON "cids"("ativo");

-- AddForeignKey
ALTER TABLE "cids" ADD CONSTRAINT "cids_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
