-- CreateTable
CREATE TABLE "estoque_insumos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidadeAtual" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMinima" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMaxima" INTEGER,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "localizacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estoque_insumos_insumoId_key" ON "estoque_insumos"("insumoId");

-- CreateIndex
CREATE INDEX "estoque_insumos_clinicaId_idx" ON "estoque_insumos"("clinicaId");

-- CreateIndex
CREATE INDEX "estoque_insumos_insumoId_idx" ON "estoque_insumos"("insumoId");

-- AddForeignKey
ALTER TABLE "estoque_insumos" ADD CONSTRAINT "estoque_insumos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_insumos" ADD CONSTRAINT "estoque_insumos_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Adicionar campos na tabela movimentacoes_estoque
-- Primeiro, adicionar os campos como nullable
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "tipoEstoque" TEXT;
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "estoqueMedicamentoId" TEXT;
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "estoqueInsumoId" TEXT;

-- Atualizar registros existentes para ter tipoEstoque = 'MEDICAMENTO' e estoqueMedicamentoId = estoqueId
UPDATE "movimentacoes_estoque" 
SET "tipoEstoque" = 'MEDICAMENTO', 
    "estoqueMedicamentoId" = "estoqueId"
WHERE "tipoEstoque" IS NULL;

-- Agora tornar tipoEstoque obrigatório (só se não for já NOT NULL)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movimentacoes_estoque' 
        AND column_name = 'tipoEstoque' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "movimentacoes_estoque" ALTER COLUMN "tipoEstoque" SET NOT NULL;
        ALTER TABLE "movimentacoes_estoque" ALTER COLUMN "tipoEstoque" SET DEFAULT 'MEDICAMENTO';
    END IF;
END $$;

-- Criar índices
CREATE INDEX "movimentacoes_estoque_estoqueMedicamentoId_idx" ON "movimentacoes_estoque"("estoqueMedicamentoId");
CREATE INDEX "movimentacoes_estoque_estoqueInsumoId_idx" ON "movimentacoes_estoque"("estoqueInsumoId");
CREATE INDEX "movimentacoes_estoque_tipoEstoque_idx" ON "movimentacoes_estoque"("tipoEstoque");

-- Adicionar foreign keys
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_estoqueMedicamentoId_fkey" FOREIGN KEY ("estoqueMedicamentoId") REFERENCES "estoque_medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_estoqueInsumoId_fkey" FOREIGN KEY ("estoqueInsumoId") REFERENCES "estoque_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remover a foreign key antiga e a coluna estoqueId (opcional, mas vamos manter por compatibilidade temporária)
-- ALTER TABLE "movimentacoes_estoque" DROP CONSTRAINT IF EXISTS "movimentacoes_estoque_estoqueId_fkey";
-- ALTER TABLE "movimentacoes_estoque" DROP COLUMN IF EXISTS "estoqueId";
