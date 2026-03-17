import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { TipoUsuario, StatusClinica } from "@/lib/generated/prisma";
import { TenantInfo } from "@/types/next-auth";
import { prisma } from "./prisma";
import { getSignedUrlFromS3 } from "./s3-service";

/**
 * Obtém a sessão do usuário no servidor
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Verifica se o usuário está autenticado
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * Verifica se o usuário é Super Admin
 */
export async function isSuperAdmin() {
  const session = await getSession();
  return session?.user?.tipo === TipoUsuario.SUPER_ADMIN;
}

/**
 * Verifica se o usuário tem um tipo específico (no tenant atual)
 */
export async function hasUserType(tipo: TipoUsuario) {
  const session = await getSession();
  return session?.user?.tipo === tipo;
}

/**
 * Obtém o ID da clínica atual do usuário logado
 */
export async function getUserClinicaId() {
  const session = await getSession();
  return session?.user?.clinicaId ?? null;
}

/**
 * Obtém o nome da clínica atual do usuário logado
 */
export async function getUserClinicaNome() {
  const session = await getSession();
  return session?.user?.clinicaNome ?? null;
}

/**
 * Obtém o ID do médico do usuário logado NO TENANT ATUAL
 * Importante: Um usuário pode ser médico em múltiplas clínicas,
 * então precisamos filtrar pelo tenant atual
 */
export async function getUserMedicoId() {
  const session = await getSession();
  if (!session?.user?.id || !session?.user?.clinicaId) return null;

  const { prisma } = await import("./prisma");

  // Buscar médico pelo usuarioId E clinicaId atual
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId: session.user.clinicaId,
      ativo: true,
    },
    select: { id: true },
  });

  return medico?.id ?? null;
}

/**
 * Obtém todos os tenants disponíveis para o usuário
 * Busca os dados completos do banco quando necessário
 */
export async function getUserTenants(): Promise<TenantInfo[]> {
  const session = await getSession();
  const tenantIds = (session?.user?.tenantIds as string[]) || [];
  
  if (tenantIds.length === 0) {
    return [];
  }

  // Buscar dados completos dos tenants do banco
  const tenants = await prisma.tenant.findMany({
    where: {
      id: { in: tenantIds },
      status: StatusClinica.ATIVA,
    },
    select: {
      id: true,
      nome: true,
      logoUrl: true,
    },
  });

  // Determinar o tipo do usuário em cada tenant
  const tenantInfos: TenantInfo[] = await Promise.all(
    tenants.map(async (tenant) => {
      let tipo = session?.user?.tipo || TipoUsuario.MEDICO;
      
      // Verificar tipo via UsuarioTenant
      const usuarioTenant = await prisma.usuarioTenant.findUnique({
        where: {
          usuarioId_tenantId: {
            usuarioId: session!.user!.id,
            tenantId: tenant.id,
          },
        },
      });

      if (usuarioTenant) {
        tipo = usuarioTenant.tipo;
      } else if (session?.user?.tipo === TipoUsuario.MEDICO) {
        // Verificar via tabela Medico
        const medico = await prisma.medico.findFirst({
          where: {
            usuarioId: session!.user!.id,
            clinicaId: tenant.id,
            ativo: true,
          },
        });
        if (medico) {
          tipo = TipoUsuario.MEDICO;
        }
      }

      // Mesma lógica do PDF: preferir tenant.logoUrl, fallback para avatar do admin
      let logoKey: string | null = tenant.logoUrl ?? null;
      if (!logoKey) {
        const adminUser = await prisma.usuario.findFirst({
          where: { clinicaId: tenant.id, tipo: TipoUsuario.ADMIN_CLINICA, ativo: true },
          select: { avatar: true },
          orderBy: { createdAt: "asc" },
        });
        logoKey = adminUser?.avatar ?? null;
      }

      let logoUrl: string | null = null;
      if (logoKey) {
        try {
          logoUrl = await getSignedUrlFromS3(logoKey, 3600);
        } catch {
          logoUrl = null;
        }
      }

      return {
        id: tenant.id,
        nome: tenant.nome,
        tipo,
        logoUrl,
      };
    })
  );

  return tenantInfos;
}

/**
 * Verifica se o usuário tem acesso a um tenant específico
 */
export async function hasAccessToTenant(tenantId: string): Promise<boolean> {
  const session = await getSession();
  const tenantIds = (session?.user?.tenantIds as string[]) || [];
  return tenantIds.includes(tenantId);
}

/**
 * Verifica se o usuário precisa selecionar um tenant
 */
export async function requiresTenantSelection(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.requiresTenantSelection ?? false;
}

/**
 * Obtém o papel do usuário em um tenant específico
 */
export async function getUserRoleInTenant(
  tenantId: string
): Promise<TipoUsuario | null> {
  const tenants = await getUserTenants();
  const tenant = tenants.find((t) => t.id === tenantId);
  return tenant?.tipo ?? null;
}
