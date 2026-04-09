/**
 * LGPD — AuditLog: registra acessos e modificações em dados sensíveis.
 *
 * Uso: chamar `auditLog(...)` após a ação. A gravação é fire-and-forget
 * (não bloqueia a response) para não impactar a latência da API.
 */

import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { NextRequest } from "next/server";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "LOGIN"
  | "LOGOUT"
  | "ACCESS_DENIED";

export type AuditResource =
  | "Prontuario"
  | "Paciente"
  | "Consulta"
  | "Prescricao"
  | "Exame"
  | "Documento"
  | "Usuario"
  | "ClinicalRoute";

export interface AuditLogParams {
  userId: string;
  userTipo: TipoUsuario;
  clinicaId?: string | null;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  req?: NextRequest;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  return (
    req.headers.get("x-client-ip") ||  // Injetado pelo middleware
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    (req as any).ip ||
    undefined
  );
}

function getUserAgent(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  const ua = req.headers.get("user-agent");
  // Truncar para não estourar o campo
  return ua ? ua.substring(0, 512) : undefined;
}

/**
 * Compara o registro anterior com os novos dados e retorna os campos alterados.
 * Útil para registrar no audit log exatamente o que foi modificado.
 *
 * Campos sensíveis (senha, hash) são omitidos do diff.
 */
export function getChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { de: unknown; para: unknown }> | null {
  const SENSITIVE_KEYS = ["senha", "password", "hash", "token", "secret"];
  const changes: Record<string, { de: unknown; para: unknown }> = {};

  for (const key of Object.keys(after)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) continue;

    const oldVal = before[key];
    const newVal = after[key];

    // Comparar como string para datas e valores simples
    const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? "");
    const newStr = newVal instanceof Date ? newVal.toISOString() : String(newVal ?? "");

    if (oldStr !== newStr) {
      changes[key] = { de: oldVal ?? null, para: newVal ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

// ── Função principal ─────────────────────────────────────────────────────────

/**
 * Registra um evento no audit log.
 *
 * Fire-and-forget: retorna void e grava em background.
 * Erros são logados no console, nunca propagados ao caller.
 */
export function auditLog(params: AuditLogParams): void {
  const { userId, userTipo, clinicaId, action, resource, resourceId, details, req } = params;

  // Gravar em background — não bloqueia a response
  prisma.auditLog
    .create({
      data: {
        userId,
        userTipo: userTipo,
        clinicaId: clinicaId || undefined,
        action,
        resource,
        resourceId: resourceId || undefined,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: details ? (details as any) : undefined,
      },
    })
    .catch((err) => {
      console.error("[AuditLog] Erro ao gravar:", err);
    });
}

// ── Helpers para extrair dados da session/request ────────────────────────────

/**
 * Helper para uso em API routes: extrai userId, userTipo e clinicaId
 * da session do NextAuth e chama auditLog.
 */
export function auditLogFromSession(
  session: { user: { id: string; tipo: TipoUsuario; clinicaId?: string | null } },
  params: Omit<AuditLogParams, "userId" | "userTipo" | "clinicaId">
): void {
  auditLog({
    userId: session.user.id,
    userTipo: session.user.tipo,
    clinicaId: session.user.clinicaId,
    ...params,
  });
}

/**
 * Helper que extrai userId/userTipo/clinicaId dos headers do middleware
 * (x-user-id, x-user-tipo, x-clinica-id) — útil para routes que não
 * expõem a session diretamente.
 */
export function auditLogFromRequest(
  req: NextRequest,
  params: Omit<AuditLogParams, "userId" | "userTipo" | "clinicaId" | "req">
): void {
  const userId = req.headers.get("x-user-id");
  const userTipo = req.headers.get("x-user-tipo") as TipoUsuario | null;

  if (!userId || !userTipo) return; // Sem auth, sem log

  auditLog({
    userId,
    userTipo,
    clinicaId: req.headers.get("x-clinica-id") || undefined,
    req,
    ...params,
  });
}
