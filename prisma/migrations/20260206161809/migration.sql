/*
  Warnings:

  - A unique constraint covering the columns `[clinicaId,usuarioId]` on the table `medicos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "medicos_usuarioId_key";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "usuarios_tenants" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usuarios_tenants_usuarioId_idx" ON "usuarios_tenants"("usuarioId");

-- CreateIndex
CREATE INDEX "usuarios_tenants_tenantId_idx" ON "usuarios_tenants"("tenantId");

-- CreateIndex
CREATE INDEX "usuarios_tenants_tipo_idx" ON "usuarios_tenants"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenants_usuarioId_tenantId_key" ON "usuarios_tenants"("usuarioId", "tenantId");

-- CreateIndex
CREATE INDEX "medicos_usuarioId_idx" ON "medicos"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_clinicaId_usuarioId_key" ON "medicos"("clinicaId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeCustomerId_key" ON "tenants"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeSubscriptionId_key" ON "tenants"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "tenants_stripeCustomerId_idx" ON "tenants"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "usuarios_tenants" ADD CONSTRAINT "usuarios_tenants_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_tenants" ADD CONSTRAINT "usuarios_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
