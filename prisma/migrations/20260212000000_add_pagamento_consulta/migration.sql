-- CreateTable
CREATE TABLE IF NOT EXISTS "pagamentos_consultas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "consultaId" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "metodoPagamento" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "transacaoId" TEXT,
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_consultas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pagamentos_consultas_stripeSessionId_key" ON "pagamentos_consultas"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_clinicaId_idx" ON "pagamentos_consultas"("clinicaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_pacienteId_idx" ON "pagamentos_consultas"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_consultaId_idx" ON "pagamentos_consultas"("consultaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_status_idx" ON "pagamentos_consultas"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_stripeSessionId_idx" ON "pagamentos_consultas"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagamentos_consultas_dataPagamento_idx" ON "pagamentos_consultas"("dataPagamento");

-- AddForeignKey
ALTER TABLE "pagamentos_consultas" ADD CONSTRAINT "pagamentos_consultas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_consultas" ADD CONSTRAINT "pagamentos_consultas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_consultas" ADD CONSTRAINT "pagamentos_consultas_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
