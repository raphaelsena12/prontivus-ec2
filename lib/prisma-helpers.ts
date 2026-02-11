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
