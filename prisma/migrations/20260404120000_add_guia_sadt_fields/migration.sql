-- AlterTable: Paciente - add CNS and numeroCarteirinha
ALTER TABLE "pacientes" ADD COLUMN "cns" TEXT;
ALTER TABLE "pacientes" ADD COLUMN "numeroCarteirinha" TEXT;

-- AlterTable: Tenant - add codigoCnes
ALTER TABLE "tenants" ADD COLUMN "codigoCnes" TEXT;

-- AlterTable: Medico - add ufCrm and codigoCbo
ALTER TABLE "medicos" ADD COLUMN "ufCrm" TEXT;
ALTER TABLE "medicos" ADD COLUMN "codigoCbo" TEXT;
