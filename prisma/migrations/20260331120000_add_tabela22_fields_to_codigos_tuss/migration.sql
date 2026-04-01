-- AlterTable
-- Adiciona campos do layout ANS Tabela 22 ao catálogo de códigos TUSS
ALTER TABLE "codigos_tuss"
  ADD COLUMN "sipGrupo" TEXT,
  ADD COLUMN "categoriaProntivus" TEXT,
  ADD COLUMN "categoriaSadt" TEXT,
  ADD COLUMN "usaGuiaSadt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "subgrupoTuss" TEXT,
  ADD COLUMN "grupoTuss" TEXT,
  ADD COLUMN "capituloTuss" TEXT,
  ADD COLUMN "fonteAnsTabela22" TEXT;

-- CreateIndex
CREATE INDEX "codigos_tuss_sipGrupo_idx" ON "codigos_tuss"("sipGrupo");
CREATE INDEX "codigos_tuss_categoriaProntivus_idx" ON "codigos_tuss"("categoriaProntivus");
CREATE INDEX "codigos_tuss_categoriaSadt_idx" ON "codigos_tuss"("categoriaSadt");
CREATE INDEX "codigos_tuss_usaGuiaSadt_idx" ON "codigos_tuss"("usaGuiaSadt");
CREATE INDEX "codigos_tuss_subgrupoTuss_idx" ON "codigos_tuss"("subgrupoTuss");
CREATE INDEX "codigos_tuss_grupoTuss_idx" ON "codigos_tuss"("grupoTuss");
CREATE INDEX "codigos_tuss_capituloTuss_idx" ON "codigos_tuss"("capituloTuss");

