import { TipoUsuario } from "@/lib/generated/prisma";
import "next-auth";
import "next-auth/jwt";

// Informações de um tenant associado ao usuário
export interface TenantInfo {
  id: string;
  nome: string;
  tipo: TipoUsuario; // Papel do usuário neste tenant
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      nome: string;
      tipo: TipoUsuario; // Papel no tenant atual
      clinicaId: string | null; // ID do tenant atual
      clinicaNome?: string | null; // Nome do tenant atual
      avatar?: string | null;
      tenantIds?: string[]; // IDs dos tenants (para reduzir tamanho da sessão)
      tenants?: TenantInfo[]; // Lista completa (buscar via getUserTenants() quando necessário)
      requiresTenantSelection?: boolean; // Flag para exibir seletor de tenant
    };
  }

  interface User {
    id: string;
    email: string;
    nome: string;
    tipo: TipoUsuario;
    clinicaId: string | null;
    clinicaNome?: string | null;
    avatar?: string | null;
    tenantIds?: string[];
    tenants?: TenantInfo[];
    requiresTenantSelection?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    nome: string;
    tipo: TipoUsuario;
    clinicaId: string | null;
    clinicaNome?: string | null;
    avatar?: string | null;
    tenantIds?: string[]; // IDs dos tenants (para reduzir tamanho da sessão)
    tenants?: TenantInfo[]; // Mantido para compatibilidade, mas não usado
    requiresTenantSelection?: boolean;
  }
}



