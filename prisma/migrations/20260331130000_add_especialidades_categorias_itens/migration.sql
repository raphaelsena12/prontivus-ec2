-- CreateTable
CREATE TABLE "especialidades_categorias_itens" (
    "id" TEXT NOT NULL,
    "especialidadeId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "especialidades_categorias_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "especialidades_categorias_itens_especialidadeId_idx" ON "especialidades_categorias_itens"("especialidadeId");

-- CreateIndex
CREATE INDEX "especialidades_categorias_itens_categoriaId_idx" ON "especialidades_categorias_itens"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_categorias_itens_especialidadeId_categoriaId_key" ON "especialidades_categorias_itens"("especialidadeId", "categoriaId");

-- AddForeignKey
ALTER TABLE "especialidades_categorias_itens" ADD CONSTRAINT "especialidades_categorias_itens_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidades_medicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "especialidades_categorias_itens" ADD CONSTRAINT "especialidades_categorias_itens_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "especialidades_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

