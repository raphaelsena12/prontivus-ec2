-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN_CLINICA', 'MEDICO', 'SECRETARIA', 'PACIENTE');

-- CreateEnum
CREATE TYPE "StatusClinica" AS ENUM ('ATIVA', 'INATIVA', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "TipoPlano" AS ENUM ('BASICO', 'INTERMEDIARIO', 'PROFISSIONAL');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "StatusClinica" NOT NULL DEFAULT 'ATIVA',
    "planoId" TEXT NOT NULL,
    "tokensMensaisDisponiveis" INTEGER NOT NULL,
    "tokensConsumidos" INTEGER NOT NULL DEFAULT 0,
    "telemedicineHabilitada" BOOLEAN NOT NULL DEFAULT false,
    "dataContratacao" TIMESTAMP(3) NOT NULL,
    "dataExpiracao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" "TipoPlano" NOT NULL,
    "tokensMensais" INTEGER NOT NULL,
    "telemedicineHabilitada" BOOLEAN NOT NULL DEFAULT false,
    "preco" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "avatar" TEXT,
    "tipo" "TipoUsuario" NOT NULL,
    "clinicaId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE INDEX "tenants_cnpj_idx" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_clinicaId_idx" ON "usuarios"("clinicaId");

-- CreateIndex
CREATE INDEX "sessoes_token_idx" ON "sessoes"("token");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
