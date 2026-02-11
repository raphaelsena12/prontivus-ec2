import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { TipoUsuario, StatusClinica } from "@/lib/generated/prisma";
import { TenantInfo } from "@/types/next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Buscar usuário no banco
          const usuario = await prisma.usuario.findUnique({
            where: { email: credentials.email },
            // Removido include: { clinica: true } - pode estar causando erro se a relação não existir
          });

          if (!usuario) {
            return null;
          }

          // Verificar senha com bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            usuario.senha
          );

          if (!isPasswordValid) {
            return null;
          }

          // Verificar se usuário está ativo
          if (!usuario.ativo) {
            return null;
          }

          // SUPER_ADMIN não precisa de tenant
          if (usuario.tipo === TipoUsuario.SUPER_ADMIN) {
            await prisma.usuario.update({
              where: { id: usuario.id },
              data: { ultimoAcesso: new Date() },
            });

            return {
              id: usuario.id,
              email: usuario.email,
              nome: usuario.nome,
              tipo: TipoUsuario.SUPER_ADMIN,
              clinicaId: null,
              tenantIds: [],
              requiresTenantSelection: false,
            };
          }

          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          // Tentar buscar tenants via UsuarioTenant (novo sistema multi-tenant)
          let validTenants: Array<{
            tipo: TipoUsuario;
            isPrimary: boolean;
            tenant: { id: string; nome: string; dataExpiracao: Date | null };
          }> = [];

          try {
            const usuarioTenants = await prisma.usuarioTenant.findMany({
              select: {
                id: true,
                usuarioId: true,
                tenantId: true,
                tipo: true,
                isPrimary: true,
                ativo: true,
              },
              where: {
                usuarioId: usuario.id,
                ativo: true,
                tenant: {
                  status: StatusClinica.ATIVA,
                },
              },
              orderBy: {
                isPrimary: "desc",
              },
            });

            // Buscar tenants separadamente
            const tenantIds = usuarioTenants.map(ut => ut.tenantId);
            const tenants = await prisma.tenant.findMany({
              select: {
                id: true,
                nome: true,
                status: true,
                dataExpiracao: true,
              },
              where: {
                id: { in: tenantIds },
                status: StatusClinica.ATIVA,
              },
            });
            const tenantsMap = new Map(tenants.map(t => [t.id, t]));

            // Filtrar apenas tenants com licença válida
            validTenants = usuarioTenants
              .map((ut) => {
                const tenant = tenantsMap.get(ut.tenantId);
                if (!tenant) return null;
                return {
                  tipo: ut.tipo,
                  isPrimary: ut.isPrimary,
                  tenant,
                };
              })
              .filter((vt): vt is NonNullable<typeof vt> => {
                if (!vt) return false;
                // Se não tem dataExpiracao, permitir acesso (sem limite)
                if (!vt.tenant.dataExpiracao) return true;
                const dataExpiracao = new Date(vt.tenant.dataExpiracao);
                dataExpiracao.setHours(0, 0, 0, 0);
                return dataExpiracao >= hoje;
              });
          } catch {
            // Tabela UsuarioTenant pode não existir ainda - ignorar erro
            validTenants = [];
          }

          // Para médicos, também buscar através da tabela Medico e mesclar resultados
          // Isso garante que todas as clínicas associadas apareçam, mesmo sem UsuarioTenant
          if (usuario.tipo === TipoUsuario.MEDICO) {
            try {
              const medicos = await prisma.medico.findMany({
                where: {
                  usuarioId: usuario.id,
                  ativo: true,
                  clinica: {
                    status: StatusClinica.ATIVA,
                  },
                },
                include: {
                  clinica: {
                    select: {
                      id: true,
                      nome: true,
                      status: true,
                      dataExpiracao: true,
                    },
                  },
                },
              });

              if (process.env.NODE_ENV === "development") {
                console.log(`[AUTH] Médico ${usuario.email}: encontrados ${medicos.length} registro(s) na tabela Medico`);
              }

              // Filtrar apenas clínicas com licença válida
              const medicosValidos = medicos.filter((medico) => {
                if (!medico.clinica.dataExpiracao) return true;
                const dataExpiracao = new Date(medico.clinica.dataExpiracao);
                dataExpiracao.setHours(0, 0, 0, 0);
                return dataExpiracao >= hoje;
              });

              if (process.env.NODE_ENV === "development") {
                console.log(`[AUTH] Médico ${usuario.email}: ${medicosValidos.length} clínica(s) válida(s) após filtro de expiração`);
                medicosValidos.forEach((m, i) => {
                  console.log(`[AUTH]   Clínica ${i + 1}: ${m.clinica.nome} (${m.clinica.id})`);
                });
              }

              // Criar um Set com IDs de tenants já encontrados para evitar duplicatas
              const existingTenantIds = new Set(validTenants.map((vt) => vt.tenant.id));

              // Adicionar clínicas da tabela Medico que ainda não estão em validTenants
              let addedCount = 0;
              for (const medico of medicosValidos) {
                if (!existingTenantIds.has(medico.clinica.id)) {
                  validTenants.push({
                    tipo: TipoUsuario.MEDICO,
                    isPrimary: medico.clinica.id === usuario.clinicaId, // Se for a clínica legada, é primary
                    tenant: {
                      id: medico.clinica.id,
                      nome: medico.clinica.nome,
                      dataExpiracao: medico.clinica.dataExpiracao,
                    },
                  });
                  existingTenantIds.add(medico.clinica.id);
                  addedCount++;
                  if (process.env.NODE_ENV === "development") {
                    console.log(`[AUTH]   Adicionada clínica via Medico: ${medico.clinica.nome}`);
                  }
                } else {
                  if (process.env.NODE_ENV === "development") {
                    console.log(`[AUTH]   Clínica já existe em validTenants: ${medico.clinica.nome}`);
                  }
                }
              }

              if (process.env.NODE_ENV === "development") {
                console.log(`[AUTH] Médico ${usuario.email}: ${addedCount} clínica(s) adicionada(s) via Medico. Total de tenants: ${validTenants.length}`);
              }

              // Reordenar para manter primary primeiro
              validTenants.sort((a, b) => {
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                return 0;
              });
            } catch (error) {
              console.error("Erro ao buscar médicos:", error);
              // Em caso de erro, não bloquear o login - apenas logar o erro
              // O usuário ainda pode ter acesso via clínica legada ou UsuarioTenant
            }
          }

          // Se o usuário tem uma clínica legada e ela ainda não está na lista, adicionar
          if (usuario.clinicaId) {
            // Buscar a clínica separadamente se necessário
            const clinica = await prisma.tenant.findUnique({
              where: { id: usuario.clinicaId },
              select: { id: true, nome: true, status: true, dataExpiracao: true },
            });
            
            if (clinica) {
              const existingTenantIds = new Set(validTenants.map((vt) => vt.tenant.id));
              
              if (process.env.NODE_ENV === "development") {
                console.log(`[AUTH] Verificando clínica legada: ${clinica.nome} (${clinica.id})`);
                console.log(`[AUTH]   Já existe na lista? ${existingTenantIds.has(clinica.id)}`);
              }
              
              // Se a clínica legada não está na lista e é válida, adicionar
              if (!existingTenantIds.has(clinica.id)) {
                if (clinica.status === StatusClinica.ATIVA) {
                  // Verificar expiração apenas se tiver data definida
                  let isExpired = false;
                  if (clinica.dataExpiracao) {
                    const dataExpiracao = new Date(clinica.dataExpiracao);
                    dataExpiracao.setHours(0, 0, 0, 0);
                    isExpired = dataExpiracao < hoje;
                  }

                  if (!isExpired) {
                    validTenants.push({
                      tipo: usuario.tipo,
                      isPrimary: true, // Clínica legada é sempre primary
                      tenant: {
                        id: clinica.id,
                        nome: clinica.nome,
                        dataExpiracao: clinica.dataExpiracao,
                      },
                    });

                    if (process.env.NODE_ENV === "development") {
                      console.log(`[AUTH]   Clínica legada adicionada: ${clinica.nome}`);
                    }

                  // Reordenar para manter primary primeiro
                  validTenants.sort((a, b) => {
                    if (a.isPrimary && !b.isPrimary) return -1;
                    if (!a.isPrimary && b.isPrimary) return 1;
                    return 0;
                  });
                } else {
                  if (process.env.NODE_ENV === "development") {
                    console.log(`[AUTH]   Clínica legada expirada, não adicionada`);
                  }
                }
              } else {
                if (process.env.NODE_ENV === "development") {
                  console.log(`[AUTH]   Clínica legada inativa (status: ${clinica.status}), não adicionada`);
                }
              }
            } else {
              if (process.env.NODE_ENV === "development") {
                console.log(`[AUTH]   Clínica legada já está na lista, não adicionada novamente`);
              }
            }
            }
          }

          // Se ainda não encontrou, usar clinicaId legado (fallback para casos sem Medico)
          if (validTenants.length === 0 && usuario.clinicaId) {
            const clinicaFallback = await prisma.tenant.findUnique({
              where: { id: usuario.clinicaId },
              select: { id: true, nome: true, status: true, dataExpiracao: true },
            });
            
            if (clinicaFallback && clinicaFallback.status !== StatusClinica.ATIVA) {
              return null;
            }

            // Verificar expiração apenas se tiver data definida
            if (clinicaFallback?.dataExpiracao) {
              const dataExpiracao = new Date(clinicaFallback.dataExpiracao);
              dataExpiracao.setHours(0, 0, 0, 0);
              if (dataExpiracao < hoje) {
                return null; // Licença expirada
              }
            }
            // Se não tem dataExpiracao, permitir acesso (sem limite)

            // Usar clínica legada
            await prisma.usuario.update({
              where: { id: usuario.id },
              data: { ultimoAcesso: new Date() },
            });

            return {
              id: usuario.id,
              email: usuario.email,
              nome: usuario.nome,
              tipo: usuario.tipo,
              clinicaId: usuario.clinicaId,
              tenantIds: clinicaFallback ? [clinicaFallback.id] : [],
              requiresTenantSelection: false,
            };
          }

          // Se ainda não tem tenants válidos, negar acesso
          if (validTenants.length === 0) {
            return null;
          }

          // Construir lista de tenants disponíveis
          const tenants: TenantInfo[] = validTenants.map((ut) => ({
            id: ut.tenant.id,
            nome: ut.tenant.nome,
            tipo: ut.tipo,
          }));

          // Debug: log dos tenants encontrados (apenas em desenvolvimento)
          if (process.env.NODE_ENV === "development") {
            console.log(`[AUTH] Usuário ${usuario.email} (${usuario.tipo}): ${tenants.length} tenant(s) encontrado(s)`);
            tenants.forEach((t, i) => {
              console.log(`[AUTH]   Tenant ${i + 1}: ${t.nome} (${t.id}) - ${t.tipo}`);
            });
          }

          // Determinar tenant inicial e papel
          let initialClinicaId: string | undefined;
          let initialClinicaNome: string | undefined;
          let initialTipo: TipoUsuario = usuario.tipo; // Usar tipo do usuário como padrão
          let requiresTenantSelection = false;

          if (tenants.length === 1) {
            // Apenas um tenant - auto-selecionar
            initialClinicaId = tenants[0].id;
            initialClinicaNome = tenants[0].nome;
            initialTipo = tenants[0].tipo;
            if (process.env.NODE_ENV === "development") {
              console.log(`[AUTH] Apenas 1 tenant - auto-selecionando: ${initialClinicaNome}`);
            }
          } else if (tenants.length > 1) {
            // Múltiplos tenants - encontrar primary ou usar primeiro
            const primaryTenant = validTenants.find((ut) => ut.isPrimary);
            if (primaryTenant) {
              initialClinicaId = primaryTenant.tenant.id;
              initialClinicaNome = primaryTenant.tenant.nome;
              initialTipo = primaryTenant.tipo;
            } else {
              initialClinicaId = tenants[0].id;
              initialClinicaNome = tenants[0].nome;
              initialTipo = tenants[0].tipo;
            }
            requiresTenantSelection = true; // Exibir seletor
            if (process.env.NODE_ENV === "development") {
              console.log(`[AUTH] Múltiplos tenants (${tenants.length}) - exibindo seletor. Tenant inicial: ${initialClinicaNome}`);
            }
          } else {
            // Nenhum tenant encontrado - isso não deveria acontecer aqui
            if (process.env.NODE_ENV === "development") {
              console.error(`[AUTH] ERRO: Nenhum tenant encontrado para ${usuario.email}`);
            }
          }

          // Atualizar ultimoAcesso
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { ultimoAcesso: new Date() },
          });

          // Armazenar apenas dados essenciais para reduzir tamanho da sessão
          // clinicaNome e avatar serão buscados quando necessário
          return {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            tipo: initialTipo,
            clinicaId: initialClinicaId ?? null,
            tenantIds: tenants.map(t => t.id), // Apenas IDs
            requiresTenantSelection,
          };
        } catch (error) {
          console.error("Erro na autenticação:", error);
          console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Quando o usuário faz login, adicionar dados ao token
      // Armazenar apenas dados essenciais para reduzir tamanho
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.nome = user.nome;
        token.tipo = user.tipo;
        token.clinicaId = user.clinicaId;
        // Não armazenar clinicaNome e avatar - serão buscados quando necessário
        token.tenantIds = (user as any).tenantIds || [];
        token.requiresTenantSelection = user.requiresTenantSelection;
      }

      // Suporte para troca de tenant via session update
      if (trigger === "update" && session?.switchTenant) {
        const tenantId = session.switchTenant;
        
        // Sempre buscar dados atualizados do banco para garantir nome correto
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
              id: true,
              nome: true,
            },
          });

          if (tenant) {
            // Determinar o tipo do usuário neste tenant
            let userTipo = token.tipo;
            
            // Verificar via UsuarioTenant
            const usuarioTenant = await prisma.usuarioTenant.findUnique({
              where: {
                usuarioId_tenantId: {
                  usuarioId: token.id as string,
                  tenantId: tenantId,
                },
              },
            });

            if (usuarioTenant) {
              userTipo = usuarioTenant.tipo;
            } else if (token.tipo === TipoUsuario.MEDICO) {
              // Se é médico, verificar via tabela Medico
              const medico = await prisma.medico.findFirst({
                where: {
                  usuarioId: token.id as string,
                  clinicaId: tenantId,
                  ativo: true,
                },
              });
              if (medico) {
                userTipo = TipoUsuario.MEDICO;
              }
            }

            // Atualizar token com dados atualizados
            token.clinicaId = tenant.id;
            // Não armazenar nome no token - será buscado quando necessário
            token.tipo = userTipo;
            token.requiresTenantSelection = false;
            
            if (process.env.NODE_ENV === "development") {
              console.log(`[AUTH] Tenant atualizado no token: ${tenant.nome} (${tenant.id}) - Tipo: ${userTipo}`);
            }
          } else {
            console.error(`[AUTH] Tenant não encontrado no banco: ${tenantId}`);
          }
        } catch (error) {
          console.error("Erro ao buscar tenant no callback:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Expor dados do token na sessão
      // Minimizar dados para reduzir tamanho da sessão
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.nome = token.nome as string;
        session.user.tipo = token.tipo as TipoUsuario;
        session.user.clinicaId = token.clinicaId as string | null;
        // Não buscar nome da clínica aqui - será buscado quando necessário via API
        // Isso reduz o tamanho da sessão e evita queries desnecessárias
        session.user.clinicaNome = null;
        session.user.avatar = null;
        // Não incluir lista completa de tenants na sessão para reduzir tamanho
        // Os tenants serão buscados quando necessário via getUserTenants()
        session.user.tenantIds = (token.tenantIds as string[]) || [];
        session.user.requiresTenantSelection = token.requiresTenantSelection as boolean;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
