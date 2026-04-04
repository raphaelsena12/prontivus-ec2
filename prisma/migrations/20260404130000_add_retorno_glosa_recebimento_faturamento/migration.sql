-- CreateTable: RetornoLote
CREATE TABLE "retornos_lotes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "loteId" TEXT,
    "operadoraId" TEXT NOT NULL,
    "numeroProtocolo" TEXT,
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xmlRetorno" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retornos_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Glosa
CREATE TABLE "glosas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "guiaId" TEXT NOT NULL,
    "procedimentoId" TEXT,
    "retornoLoteId" TEXT,
    "codigoGlosa" TEXT,
    "descricaoGlosa" TEXT,
    "valorGlosado" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GLOSADA',
    "justificativaContestacao" TEXT,
    "dataGlosa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataContestacao" TIMESTAMP(3),
    "dataResolucao" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glosas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecebimentoConvenio
CREATE TABLE "recebimentos_convenio" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "loteId" TEXT,
    "valorRecebido" DECIMAL(10,2) NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL,
    "dataPrevista" TIMESTAMP(3),
    "numeroDocumento" TEXT,
    "metodoPagamento" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FaturamentoConvenio
CREATE TABLE "faturamentos_convenio" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "mesReferencia" TIMESTAMP(3) NOT NULL,
    "valorFaturado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorRecebido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorGlosado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturamentos_convenio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retornos_lotes_clinicaId_idx" ON "retornos_lotes"("clinicaId");
CREATE INDEX "retornos_lotes_loteId_idx" ON "retornos_lotes"("loteId");
CREATE INDEX "retornos_lotes_operadoraId_idx" ON "retornos_lotes"("operadoraId");
CREATE INDEX "retornos_lotes_status_idx" ON "retornos_lotes"("status");

CREATE INDEX "glosas_clinicaId_idx" ON "glosas"("clinicaId");
CREATE INDEX "glosas_guiaId_idx" ON "glosas"("guiaId");
CREATE INDEX "glosas_procedimentoId_idx" ON "glosas"("procedimentoId");
CREATE INDEX "glosas_retornoLoteId_idx" ON "glosas"("retornoLoteId");
CREATE INDEX "glosas_status_idx" ON "glosas"("status");

CREATE INDEX "recebimentos_convenio_clinicaId_idx" ON "recebimentos_convenio"("clinicaId");
CREATE INDEX "recebimentos_convenio_operadoraId_idx" ON "recebimentos_convenio"("operadoraId");
CREATE INDEX "recebimentos_convenio_loteId_idx" ON "recebimentos_convenio"("loteId");
CREATE INDEX "recebimentos_convenio_dataRecebimento_idx" ON "recebimentos_convenio"("dataRecebimento");

CREATE INDEX "faturamentos_convenio_clinicaId_idx" ON "faturamentos_convenio"("clinicaId");
CREATE INDEX "faturamentos_convenio_operadoraId_idx" ON "faturamentos_convenio"("operadoraId");
CREATE INDEX "faturamentos_convenio_mesReferencia_idx" ON "faturamentos_convenio"("mesReferencia");
CREATE INDEX "faturamentos_convenio_status_idx" ON "faturamentos_convenio"("status");
CREATE UNIQUE INDEX "faturamentos_convenio_clinicaId_operadoraId_mesReferencia_key" ON "faturamentos_convenio"("clinicaId", "operadoraId", "mesReferencia");

-- AddForeignKey
ALTER TABLE "retornos_lotes" ADD CONSTRAINT "retornos_lotes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retornos_lotes" ADD CONSTRAINT "retornos_lotes_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_tiss"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "retornos_lotes" ADD CONSTRAINT "retornos_lotes_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "glosas" ADD CONSTRAINT "glosas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "glosas" ADD CONSTRAINT "glosas_guiaId_fkey" FOREIGN KEY ("guiaId") REFERENCES "guias_tiss"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "glosas" ADD CONSTRAINT "glosas_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "guias_tiss_procedimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "glosas" ADD CONSTRAINT "glosas_retornoLoteId_fkey" FOREIGN KEY ("retornoLoteId") REFERENCES "retornos_lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recebimentos_convenio" ADD CONSTRAINT "recebimentos_convenio_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recebimentos_convenio" ADD CONSTRAINT "recebimentos_convenio_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recebimentos_convenio" ADD CONSTRAINT "recebimentos_convenio_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_tiss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "faturamentos_convenio" ADD CONSTRAINT "faturamentos_convenio_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "faturamentos_convenio" ADD CONSTRAINT "faturamentos_convenio_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
