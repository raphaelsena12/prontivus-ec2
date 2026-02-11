/**
 * Script de Migração para Multi-Tenant
 *
 * Este script migra os dados existentes do campo Usuario.clinicaId
 * para a nova tabela UsuarioTenant, habilitando suporte multi-tenant.
 *
 * Execução:
 * npx ts-node scripts/migrate-to-multi-tenant.ts
 *
 * Ou com tsx:
 * npx tsx scripts/migrate-to-multi-tenant.ts
 */

import { prisma } from "../lib/prisma";
import { TipoUsuario } from "../lib/generated/prisma";

// Prisma client já importado

async function migrateToMultiTenant() {
  console.log("=".repeat(60));
  console.log("Iniciando migração para Multi-Tenant...");
  console.log("=".repeat(60));

  try {
    // 1. Buscar todos os usuários que têm clinicaId (exceto SUPER_ADMIN)
    const usuarios = await prisma.usuario.findMany({
      where: {
        clinicaId: { not: null },
        tipo: { not: TipoUsuario.SUPER_ADMIN }
      },
      include: {
        clinica: {
          select: { id: true, nome: true }
        }
      }
    });

    console.log(`\nEncontrados ${usuarios.length} usuários para migrar.\n`);

    let migrados = 0;
    let jaExistentes = 0;
    let erros = 0;

    for (const usuario of usuarios) {
      try {
        // Verificar se já existe registro em UsuarioTenant
        const existente = await prisma.usuarioTenant.findUnique({
          where: {
            usuarioId_tenantId: {
              usuarioId: usuario.id,
              tenantId: usuario.clinicaId!
            }
          }
        });

        if (existente) {
          console.log(`⏭️  ${usuario.email} - Já migrado`);
          jaExistentes++;
          continue;
        }

        // Criar registro em UsuarioTenant
        await prisma.usuarioTenant.create({
          data: {
            usuarioId: usuario.id,
            tenantId: usuario.clinicaId!,
            tipo: usuario.tipo,
            ativo: usuario.ativo,
            isPrimary: true // Clínica atual é a principal
          }
        });

        console.log(`✅ ${usuario.email} - Migrado para ${usuario.clinica?.nome || usuario.clinicaId}`);
        migrados++;
      } catch (error) {
        console.error(`❌ Erro ao migrar ${usuario.email}:`, error);
        erros++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Migração concluída!");
    console.log("=".repeat(60));
    console.log(`✅ Migrados: ${migrados}`);
    console.log(`⏭️  Já existentes: ${jaExistentes}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total processados: ${usuarios.length}`);

    // 2. Verificar integridade - todos os usuários não-SUPER_ADMIN devem ter pelo menos um tenant
    console.log("\n" + "-".repeat(60));
    console.log("Verificando integridade dos dados...");

    const usuariosSemTenant = await prisma.usuario.findMany({
      where: {
        tipo: { not: TipoUsuario.SUPER_ADMIN },
        usuariosTenants: {
          none: {}
        }
      },
      select: { id: true, email: true, tipo: true, clinicaId: true }
    });

    if (usuariosSemTenant.length > 0) {
      console.log(`\n⚠️  ATENÇÃO: ${usuariosSemTenant.length} usuário(s) sem tenant associado:`);
      for (const u of usuariosSemTenant) {
        console.log(`   - ${u.email} (${u.tipo}) - clinicaId: ${u.clinicaId || "null"}`);
      }
    } else {
      console.log("✅ Todos os usuários têm pelo menos um tenant associado.");
    }

    // 3. Estatísticas finais
    const totalUsuariosTenants = await prisma.usuarioTenant.count();
    const usuariosMultiTenant = await prisma.usuarioTenant.groupBy({
      by: ["usuarioId"],
      _count: { tenantId: true },
      having: {
        tenantId: { _count: { gt: 1 } }
      }
    });

    console.log("\n" + "-".repeat(60));
    console.log("Estatísticas finais:");
    console.log(`📊 Total de registros em UsuarioTenant: ${totalUsuariosTenants}`);
    console.log(`👥 Usuários com múltiplos tenants: ${usuariosMultiTenant.length}`);

  } catch (error) {
    console.error("\n❌ Erro fatal durante a migração:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
migrateToMultiTenant()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro ao executar script:", error);
    process.exit(1);
  });
