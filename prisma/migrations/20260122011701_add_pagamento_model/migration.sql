-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "mesReferencia" TIMESTAMP(3) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "metodoPagamento" TEXT,
    "transacaoId" TEXT,
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagamentos_tenantId_idx" ON "pagamentos"("tenantId");

-- CreateIndex
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");

-- CreateIndex
CREATE INDEX "pagamentos_mesReferencia_idx" ON "pagamentos"("mesReferencia");

-- CreateIndex
CREATE INDEX "pagamentos_dataVencimento_idx" ON "pagamentos"("dataVencimento");

-- CreateIndex
CREATE INDEX "tenants_dataExpiracao_idx" ON "tenants"("dataExpiracao");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
