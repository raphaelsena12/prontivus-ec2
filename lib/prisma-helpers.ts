/**
 * Helpers para queries multi-tenant com Prisma
 *
 * IMPORTANTE: Multi-tenancy com SEPARAÇÃO LÓGICA
 * - Todos os dados ficam no mesmo banco
 * - Cada tabela tem um campo 'clinicaId' para identificar a qual clínica pertence
 * - Todas as queries DEVEM filtrar por clinicaId
 * - Super Admin não tem clinicaId (acessa todas)
 */

import { TipoUsuario } from "@/lib/generated/prisma";

// Prisma 7 Decimal instances don't coerce to number via Number() — reconstruct from internal decimal.js fields (s, e, d)
export function decimalToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const d = v as any;
  if (typeof d.d?.[0] !== "number") return 0;
  const digits = String(d.d[0]);
  const num = d.s * parseFloat(digits[0] + (digits.length > 1 ? "." + digits.slice(1) : "") + "e" + d.e);
  return isNaN(num) ? 0 : num;
}

/**
 * Verifica se o usuário é Super Admin
 */
export function isSuperAdmin(tipoUsuario: TipoUsuario): boolean {
  return tipoUsuario === TipoUsuario.SUPER_ADMIN;
}

/**
 * Cria um filtro de tenant para queries
 * Super Admin não tem restrição (retorna undefined)
 * Outros usuários devem filtrar por clinicaId
 */
export function getTenantFilter(
  tipoUsuario: TipoUsuario,
  clinicaId: string | null | undefined
): { clinicaId: string } | undefined {
  if (isSuperAdmin(tipoUsuario)) {
    return undefined; // Super Admin acessa todas as clínicas
  }
  if (!clinicaId) {
    throw new Error("Usuário não-Super Admin deve ter clinicaId");
  }
  return { clinicaId };
}

/**
 * Exemplo de uso em queries:
 *
 * // Buscar usuários da clínica do usuário logado
 * const usuarios = await prisma.usuario.findMany({
 *   where: {
 *     ...getTenantFilter(user.tipo, user.clinicaId),
 *     ativo: true,
 *   },
 * });
 *
 * // Super Admin pode buscar todas as clínicas
 * const todasClinicas = await prisma.tenant.findMany({
 *   where: {
 *     ...getTenantFilter(user.tipo, user.clinicaId),
 *     status: StatusClinica.ATIVA,
 *   },
 * });
 */
