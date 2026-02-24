-- Criar tabela autorizacoes_fechamento_caixa
CREATE TABLE IF NOT EXISTS "autorizacoes_fechamento_caixa" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "autorizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoEm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AUTORIZADO',
    "observacoes" TEXT,
    "assinaturaMedico" TEXT,
    "assinaturaSecretaria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autorizacoes_fechamento_caixa_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "autorizacoes_fechamento_caixa_clinicaId_idx" ON "autorizacoes_fechamento_caixa"("clinicaId");
CREATE INDEX IF NOT EXISTS "autorizacoes_fechamento_caixa_medicoId_idx" ON "autorizacoes_fechamento_caixa"("medicoId");
CREATE INDEX IF NOT EXISTS "autorizacoes_fechamento_caixa_data_idx" ON "autorizacoes_fechamento_caixa"("data");
CREATE INDEX IF NOT EXISTS "autorizacoes_fechamento_caixa_status_idx" ON "autorizacoes_fechamento_caixa"("status");

-- Criar constraint único
CREATE UNIQUE INDEX IF NOT EXISTS "autorizacoes_fechamento_caixa_clinicaId_medicoId_data_key" 
ON "autorizacoes_fechamento_caixa"("clinicaId", "medicoId", "data");

-- Criar foreign keys
ALTER TABLE "autorizacoes_fechamento_caixa" 
ADD CONSTRAINT "autorizacoes_fechamento_caixa_clinicaId_fkey" 
FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "autorizacoes_fechamento_caixa" 
ADD CONSTRAINT "autorizacoes_fechamento_caixa_medicoId_fkey" 
FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
