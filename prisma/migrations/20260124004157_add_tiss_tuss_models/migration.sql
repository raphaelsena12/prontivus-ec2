/*
  Warnings:

  - You are about to drop the column `procedimentoId` on the `consultas` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `consultas` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `consultas` table. All the data in the column will be lost.
  - Added the required column `codigoTussId` to the `consultas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "consultas" DROP CONSTRAINT "consultas_procedimentoId_fkey";

-- AlterTable
ALTER TABLE "consultas" DROP COLUMN "procedimentoId",
DROP COLUMN "tipo",
DROP COLUMN "valor",
ADD COLUMN     "codigoTussId" TEXT NOT NULL,
ADD COLUMN     "dataAutorizacao" TIMESTAMP(3),
ADD COLUMN     "numeroAutorizacao" TEXT,
ADD COLUMN     "numeroCarteirinha" TEXT,
ADD COLUMN     "operadoraId" TEXT,
ADD COLUMN     "planoSaudeId" TEXT,
ADD COLUMN     "preparadoTiss" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipoConsultaId" TEXT,
ADD COLUMN     "valorCobrado" DECIMAL(10,2),
ADD COLUMN     "valorRepassado" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "especialidades_medicas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especialidades_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuss_grupos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupoPaiId" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuss_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_tuss" (
    "id" TEXT NOT NULL,
    "codigoTuss" TEXT NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "descricaoDetalhada" TEXT,
    "tipoProcedimento" TEXT NOT NULL,
    "grupoId" TEXT,
    "dataVigenciaInicio" TIMESTAMP(3) NOT NULL,
    "dataVigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codigos_tuss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuss_especialidades" (
    "id" TEXT NOT NULL,
    "codigoTussId" TEXT NOT NULL,
    "especialidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tuss_especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_consulta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operadoras" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "codigoAns" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_saude" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "codigoAns" TEXT,
    "nome" TEXT NOT NULL,
    "tipoPlano" TEXT NOT NULL,
    "abrangencia" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuss_valores" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "codigoTussId" TEXT NOT NULL,
    "operadoraId" TEXT,
    "planoSaudeId" TEXT,
    "tipoConsultaId" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVigenciaInicio" TIMESTAMP(3) NOT NULL,
    "dataVigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuss_valores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuss_operadoras" (
    "id" TEXT NOT NULL,
    "codigoTussId" TEXT NOT NULL,
    "operadoraId" TEXT,
    "planoSaudeId" TEXT,
    "aceito" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuss_operadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes_planos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoSaudeId" TEXT NOT NULL,
    "numeroCarteirinha" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "titular" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guias_tiss" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "tipoGuia" TEXT NOT NULL,
    "numeroGuia" TEXT,
    "xmlGuia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GERADA',
    "dataGeracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataEnvio" TIMESTAMP(3),
    "dataResposta" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guias_tiss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos_especialidades" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "especialidadeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicos_especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_medicas_codigo_key" ON "especialidades_medicas"("codigo");

-- CreateIndex
CREATE INDEX "especialidades_medicas_codigo_idx" ON "especialidades_medicas"("codigo");

-- CreateIndex
CREATE INDEX "especialidades_medicas_ativo_idx" ON "especialidades_medicas"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "tuss_grupos_codigo_key" ON "tuss_grupos"("codigo");

-- CreateIndex
CREATE INDEX "tuss_grupos_codigo_idx" ON "tuss_grupos"("codigo");

-- CreateIndex
CREATE INDEX "tuss_grupos_grupoPaiId_idx" ON "tuss_grupos"("grupoPaiId");

-- CreateIndex
CREATE INDEX "tuss_grupos_ativo_idx" ON "tuss_grupos"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_tuss_codigoTuss_key" ON "codigos_tuss"("codigoTuss");

-- CreateIndex
CREATE INDEX "codigos_tuss_codigoTuss_idx" ON "codigos_tuss"("codigoTuss");

-- CreateIndex
CREATE INDEX "codigos_tuss_tipoProcedimento_idx" ON "codigos_tuss"("tipoProcedimento");

-- CreateIndex
CREATE INDEX "codigos_tuss_grupoId_idx" ON "codigos_tuss"("grupoId");

-- CreateIndex
CREATE INDEX "codigos_tuss_dataVigenciaInicio_dataVigenciaFim_idx" ON "codigos_tuss"("dataVigenciaInicio", "dataVigenciaFim");

-- CreateIndex
CREATE INDEX "codigos_tuss_ativo_idx" ON "codigos_tuss"("ativo");

-- CreateIndex
CREATE INDEX "tuss_especialidades_codigoTussId_idx" ON "tuss_especialidades"("codigoTussId");

-- CreateIndex
CREATE INDEX "tuss_especialidades_especialidadeId_idx" ON "tuss_especialidades"("especialidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "tuss_especialidades_codigoTussId_especialidadeId_key" ON "tuss_especialidades"("codigoTussId", "especialidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_consulta_codigo_key" ON "tipos_consulta"("codigo");

-- CreateIndex
CREATE INDEX "tipos_consulta_codigo_idx" ON "tipos_consulta"("codigo");

-- CreateIndex
CREATE INDEX "tipos_consulta_ativo_idx" ON "tipos_consulta"("ativo");

-- CreateIndex
CREATE INDEX "operadoras_clinicaId_idx" ON "operadoras"("clinicaId");

-- CreateIndex
CREATE INDEX "operadoras_codigoAns_idx" ON "operadoras"("codigoAns");

-- CreateIndex
CREATE INDEX "operadoras_cnpj_idx" ON "operadoras"("cnpj");

-- CreateIndex
CREATE INDEX "operadoras_ativo_idx" ON "operadoras"("ativo");

-- CreateIndex
CREATE INDEX "planos_saude_operadoraId_idx" ON "planos_saude"("operadoraId");

-- CreateIndex
CREATE INDEX "planos_saude_codigoAns_idx" ON "planos_saude"("codigoAns");

-- CreateIndex
CREATE INDEX "planos_saude_ativo_idx" ON "planos_saude"("ativo");

-- CreateIndex
CREATE INDEX "tuss_valores_clinicaId_idx" ON "tuss_valores"("clinicaId");

-- CreateIndex
CREATE INDEX "tuss_valores_codigoTussId_idx" ON "tuss_valores"("codigoTussId");

-- CreateIndex
CREATE INDEX "tuss_valores_operadoraId_idx" ON "tuss_valores"("operadoraId");

-- CreateIndex
CREATE INDEX "tuss_valores_planoSaudeId_idx" ON "tuss_valores"("planoSaudeId");

-- CreateIndex
CREATE INDEX "tuss_valores_tipoConsultaId_idx" ON "tuss_valores"("tipoConsultaId");

-- CreateIndex
CREATE INDEX "tuss_valores_dataVigenciaInicio_dataVigenciaFim_idx" ON "tuss_valores"("dataVigenciaInicio", "dataVigenciaFim");

-- CreateIndex
CREATE INDEX "tuss_valores_ativo_idx" ON "tuss_valores"("ativo");

-- CreateIndex
CREATE INDEX "tuss_operadoras_codigoTussId_idx" ON "tuss_operadoras"("codigoTussId");

-- CreateIndex
CREATE INDEX "tuss_operadoras_operadoraId_idx" ON "tuss_operadoras"("operadoraId");

-- CreateIndex
CREATE INDEX "tuss_operadoras_planoSaudeId_idx" ON "tuss_operadoras"("planoSaudeId");

-- CreateIndex
CREATE UNIQUE INDEX "tuss_operadoras_codigoTussId_operadoraId_planoSaudeId_key" ON "tuss_operadoras"("codigoTussId", "operadoraId", "planoSaudeId");

-- CreateIndex
CREATE INDEX "pacientes_planos_pacienteId_idx" ON "pacientes_planos"("pacienteId");

-- CreateIndex
CREATE INDEX "pacientes_planos_planoSaudeId_idx" ON "pacientes_planos"("planoSaudeId");

-- CreateIndex
CREATE INDEX "pacientes_planos_ativo_idx" ON "pacientes_planos"("ativo");

-- CreateIndex
CREATE INDEX "pacientes_planos_numeroCarteirinha_idx" ON "pacientes_planos"("numeroCarteirinha");

-- CreateIndex
CREATE UNIQUE INDEX "guias_tiss_numeroGuia_key" ON "guias_tiss"("numeroGuia");

-- CreateIndex
CREATE INDEX "guias_tiss_clinicaId_idx" ON "guias_tiss"("clinicaId");

-- CreateIndex
CREATE INDEX "guias_tiss_consultaId_idx" ON "guias_tiss"("consultaId");

-- CreateIndex
CREATE INDEX "guias_tiss_numeroGuia_idx" ON "guias_tiss"("numeroGuia");

-- CreateIndex
CREATE INDEX "guias_tiss_status_idx" ON "guias_tiss"("status");

-- CreateIndex
CREATE INDEX "guias_tiss_tipoGuia_idx" ON "guias_tiss"("tipoGuia");

-- CreateIndex
CREATE INDEX "medicos_especialidades_medicoId_idx" ON "medicos_especialidades"("medicoId");

-- CreateIndex
CREATE INDEX "medicos_especialidades_especialidadeId_idx" ON "medicos_especialidades"("especialidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_especialidades_medicoId_especialidadeId_key" ON "medicos_especialidades"("medicoId", "especialidadeId");

-- CreateIndex
CREATE INDEX "consultas_codigoTussId_idx" ON "consultas"("codigoTussId");

-- CreateIndex
CREATE INDEX "consultas_operadoraId_idx" ON "consultas"("operadoraId");

-- CreateIndex
CREATE INDEX "consultas_planoSaudeId_idx" ON "consultas"("planoSaudeId");

-- CreateIndex
CREATE INDEX "consultas_tipoConsultaId_idx" ON "consultas"("tipoConsultaId");

-- AddForeignKey
ALTER TABLE "tuss_grupos" ADD CONSTRAINT "tuss_grupos_grupoPaiId_fkey" FOREIGN KEY ("grupoPaiId") REFERENCES "tuss_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_tuss" ADD CONSTRAINT "codigos_tuss_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "tuss_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_especialidades" ADD CONSTRAINT "tuss_especialidades_codigoTussId_fkey" FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_especialidades" ADD CONSTRAINT "tuss_especialidades_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidades_medicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operadoras" ADD CONSTRAINT "operadoras_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_saude" ADD CONSTRAINT "planos_saude_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_valores" ADD CONSTRAINT "tuss_valores_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_valores" ADD CONSTRAINT "tuss_valores_codigoTussId_fkey" FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_valores" ADD CONSTRAINT "tuss_valores_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_valores" ADD CONSTRAINT "tuss_valores_planoSaudeId_fkey" FOREIGN KEY ("planoSaudeId") REFERENCES "planos_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_valores" ADD CONSTRAINT "tuss_valores_tipoConsultaId_fkey" FOREIGN KEY ("tipoConsultaId") REFERENCES "tipos_consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_operadoras" ADD CONSTRAINT "tuss_operadoras_codigoTussId_fkey" FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_operadoras" ADD CONSTRAINT "tuss_operadoras_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuss_operadoras" ADD CONSTRAINT "tuss_operadoras_planoSaudeId_fkey" FOREIGN KEY ("planoSaudeId") REFERENCES "planos_saude"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_planos" ADD CONSTRAINT "pacientes_planos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_planos" ADD CONSTRAINT "pacientes_planos_planoSaudeId_fkey" FOREIGN KEY ("planoSaudeId") REFERENCES "planos_saude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_especialidades" ADD CONSTRAINT "medicos_especialidades_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_especialidades" ADD CONSTRAINT "medicos_especialidades_especialidadeId_fkey" FOREIGN KEY ("especialidadeId") REFERENCES "especialidades_medicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_codigoTussId_fkey" FOREIGN KEY ("codigoTussId") REFERENCES "codigos_tuss"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_tipoConsultaId_fkey" FOREIGN KEY ("tipoConsultaId") REFERENCES "tipos_consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "operadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_planoSaudeId_fkey" FOREIGN KEY ("planoSaudeId") REFERENCES "planos_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;
