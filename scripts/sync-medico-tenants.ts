/**
 * Script para sincronizar UsuarioTenant baseado nos registros de Medico
 *
 * Este script garante que todo médico tenha um UsuarioTenant para cada clínica
 * onde ele está cadastrado como médico.
 *
 * Execução: npx tsx scripts/sync-medico-tenants.ts
 */

import { prisma } from "../lib/prisma";
import { TipoUsuario } from "../lib/generated/prisma/enums";

// Prisma client já importado

async function syncMedicoTenants() {
  console.log("🔄 Sincronizando UsuarioTenant baseado em registros de Medico...\n");

  // Buscar todos os médicos ativos
  const medicos = await prisma.medico.findMany({
    where: { ativo: true },
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          clinicaId: true, // Clínica principal legada
        },
      },
      clinica: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  console.log(`📋 Encontrados ${medicos.length} registros de médicos ativos\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const medico of medicos) {
    const usuarioId = medico.usuarioId;
    const tenantId = medico.clinicaId;
    const isPrimary = medico.usuario.clinicaId === tenantId;

    try {
      // Verificar se já existe UsuarioTenant
      const existing = await prisma.usuarioTenant.findUnique({
        where: {
          usuarioId_tenantId: {
            usuarioId,
            tenantId,
          },
        },
      });

      if (existing) {
        console.log(`⏭️  ${medico.usuario.nome} já tem vínculo com ${medico.clinica.nome}`);
        skipped++;
        continue;
      }

      // Criar UsuarioTenant
      await prisma.usuarioTenant.create({
        data: {
          usuarioId,
          tenantId,
          tipo: TipoUsuario.MEDICO,
          ativo: true,
          isPrimary,
        },
      });

      console.log(`✅ Criado vínculo: ${medico.usuario.nome} -> ${medico.clinica.nome} (primary: ${isPrimary})`);
      created++;
    } catch (error) {
      console.error(`❌ Erro ao processar médico ${medico.usuario.nome}:`, error);
      errors++;
    }
  }

  console.log("\n📊 Resumo:");
  console.log(`   ✅ Criados: ${created}`);
  console.log(`   ⏭️  Já existentes: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);

  // Listar usuários com múltiplos tenants
  console.log("\n👥 Usuários com múltiplos tenants:");

  const usuariosMultiTenant = await prisma.usuarioTenant.groupBy({
    by: ["usuarioId"],
    _count: { tenantId: true },
    having: {
      tenantId: { _count: { gt: 1 } },
    },
  });

  for (const ut of usuariosMultiTenant) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: ut.usuarioId },
      select: { nome: true, email: true },
    });

    const tenants = await prisma.usuarioTenant.findMany({
      where: { usuarioId: ut.usuarioId },
      include: { tenant: { select: { nome: true } } },
    });

    console.log(`   🏥 ${usuario?.nome} (${usuario?.email}): ${ut._count.tenantId} clínicas`);
    for (const t of tenants) {
      console.log(`      - ${t.tenant.nome} (${t.isPrimary ? "Principal" : "Secundária"})`);
    }
  }
}

syncMedicoTenants()
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
