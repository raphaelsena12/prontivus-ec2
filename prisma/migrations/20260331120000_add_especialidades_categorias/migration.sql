-- CreateTable
CREATE TABLE "especialidades_categorias" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especialidades_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_categorias_codigo_key" ON "especialidades_categorias"("codigo");

-- CreateIndex
CREATE INDEX "especialidades_categorias_codigo_idx" ON "especialidades_categorias"("codigo");

-- CreateIndex
CREATE INDEX "especialidades_categorias_ativo_idx" ON "especialidades_categorias"("ativo");

