import { prisma } from "@/lib/prisma";
import type { TipoUsuario } from "@/lib/generated/prisma";
import { createHash } from "crypto";

/**
 * Audit trail para operações de IA clínica.
 *
 * Requisito regulatório (CFM Res. 2.299/2021 + LGPD):
 * toda sugestão clínica gerada por IA que influencie decisão médica deve ser
 * rastreável por 20 anos. Registra: quem chamou, modelo, prompt-hash, output-hash,
 * paciente/consulta relacionados, e metadados de custo.
 *
 * Persistência usa a tabela AuditLog existente, com resource="clinical_ai" e
 * payload estruturado em `details`.
 */

export type ClinicalAIAction =
  | "process-transcription"
  | "anamnese-stream"
  | "generate-anamnese"
  | "analisar-exames"
  | "analisar-exame-detalhado"
  | "resumo-clinico"
  | "resumo-paciente"
  | "sugerir-prescricao";

export interface ClinicalAIAuditInput {
  clinicaId?: string | null;
  userId: string;
  userTipo: TipoUsuario;
  action: ClinicalAIAction;
  consultaId?: string | null;
  pacienteId?: string | null;
  model: string;
  promptHash?: string;
  outputHash?: string;
  tokensUsed?: number;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  extra?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Gera hash SHA-256 determinístico para registro sem armazenar conteúdo bruto.
 * Permite provar que uma determinada entrada/saída foi a mesma no futuro
 * sem reter PII desnecessariamente.
 */
export function hashClinicalText(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex").substring(0, 32);
}

/**
 * Grava evento de IA clínica no audit trail.
 * Falhas de escrita são logadas mas NUNCA lançadas — audit nunca deve quebrar o fluxo clínico.
 */
export async function logClinicalAI(input: ClinicalAIAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicaId: input.clinicaId || null,
        userId: input.userId,
        userTipo: input.userTipo,
        action: input.action,
        resource: "clinical_ai",
        resourceId: input.consultaId || input.pacienteId || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        details: {
          consultaId: input.consultaId,
          pacienteId: input.pacienteId,
          model: input.model,
          promptHash: input.promptHash,
          outputHash: input.outputHash,
          tokensUsed: input.tokensUsed,
          latencyMs: input.latencyMs,
          success: input.success,
          errorMessage: input.errorMessage,
          ...input.extra,
        },
      },
    });
  } catch (error) {
    console.error("[clinical-ai-audit] Falha ao gravar audit log:", error);
  }
}
