-- Alteração do modelo de Medicamentos (catálogo global) para suportar novo cadastro
-- Campos compatíveis com a planilha:
-- active_ingredient, commercial_name, pharmaceutical_form, concentration, presentation, unit,
-- therapeutic_class, prescription_type, control_type, pregnancy_risk, pediatric_use,
-- hepatic_alert, renal_alert, high_risk, status

ALTER TABLE "medicamentos"
  ADD COLUMN IF NOT EXISTS "pharmaceuticalForm" TEXT,
  ADD COLUMN IF NOT EXISTS "therapeuticClass"  TEXT,
  ADD COLUMN IF NOT EXISTS "prescriptionType"  TEXT,
  ADD COLUMN IF NOT EXISTS "controlType"       TEXT,
  ADD COLUMN IF NOT EXISTS "pregnancyRisk"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pediatricUse"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "hepaticAlert"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "renalAlert"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "highRisk"          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "status"            TEXT NOT NULL DEFAULT 'active';

