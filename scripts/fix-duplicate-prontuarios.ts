/**
 * Script para Corrigir Números de Prontuário Duplicados
 *
 * Este script verifica e corrige números de prontuário duplicados,
 * garantindo que cada número seja único globalmente antes de aplicar
 * a constraint de unicidade global.
 *
 * Execução:
 * npx tsx scripts/fix-duplicate-prontuarios.ts
 */

import { prisma } from "../lib/prisma";

async function fixDuplicateProntuarios() {
  console.log("=".repeat(60));
  console.log("Verificando números de prontuário duplicados...");
  console.log("=".repeat(60));

  try {
    // 1. Buscar todos os números duplicados
    const duplicados = await prisma.$queryRaw<Array<{ numeroProntuario: number; count: bigint }>>`
      SELECT "numeroProntuario", COUNT(*) as count
      FROM pacientes
      WHERE "numeroProntuario" IS NOT NULL
      GROUP BY "numeroProntuario"
      HAVING COUNT(*) > 1
      ORDER BY "numeroProntuario"
    `;

    if (duplicados.length === 0) {
      console.log("\n✅ Nenhum número duplicado encontrado!");
      console.log("O banco de dados está pronto para a migration.");
      return;
    }

    console.log(`\n⚠️  Encontrados ${duplicados.length} número(s) duplicado(s):\n`);

    // 2. Buscar o maior número atual
    const maiorNumero = await prisma.paciente.findFirst({
      where: {
        numeroProntuario: {
          not: null,
        },
      },
      orderBy: {
        numeroProntuario: "desc",
      },
      select: {
        numeroProntuario: true,
      },
    });

    let proximoNumero = maiorNumero?.numeroProntuario ? maiorNumero.numeroProntuario + 1 : 1;
    let corrigidos = 0;

    // 3. Para cada número duplicado, manter o primeiro e corrigir os demais
    for (const dup of duplicados) {
      const numero = Number(dup.numeroProntuario);
      const count = Number(dup.count);

      console.log(`\n📋 Número ${numero} aparece ${count} vez(es):`);

      // Buscar todos os pacientes com este número
      const pacientes = await prisma.paciente.findMany({
        where: {
          numeroProntuario: numero,
        },
        orderBy: {
          createdAt: "asc", // Manter o primeiro criado
        },
        select: {
          id: true,
          nome: true,
          clinicaId: true,
          createdAt: true,
        },
      });

      // Manter o primeiro (mais antigo)
      const manter = pacientes[0];
      console.log(`   ✅ Mantendo: ${manter.nome} (ID: ${manter.id}, Criado: ${manter.createdAt.toLocaleDateString("pt-BR")})`);

      // Corrigir os demais
      for (let i = 1; i < pacientes.length; i++) {
        const paciente = pacientes[i];
        const novoNumero = proximoNumero++;

        await prisma.paciente.update({
          where: { id: paciente.id },
          data: { numeroProntuario: novoNumero },
        });

        console.log(`   🔄 Corrigido: ${paciente.nome} (ID: ${paciente.id}) → Novo número: ${novoNumero}`);
        corrigidos++;
      }
    }

    // 4. Verificar se ainda há duplicados
    const duplicadosRestantes = await prisma.$queryRaw<Array<{ numeroProntuario: number; count: bigint }>>`
      SELECT "numeroProntuario", COUNT(*) as count
      FROM pacientes
      WHERE "numeroProntuario" IS NOT NULL
      GROUP BY "numeroProntuario"
      HAVING COUNT(*) > 1
    `;

    console.log("\n" + "=".repeat(60));
    console.log("Correção concluída!");
    console.log("=".repeat(60));
    console.log(`✅ Números corrigidos: ${corrigidos}`);
    console.log(`📊 Total de duplicados encontrados: ${duplicados.length}`);

    if (duplicadosRestantes.length > 0) {
      console.log(`\n⚠️  ATENÇÃO: Ainda existem ${duplicadosRestantes.length} número(s) duplicado(s)!`);
      console.log("Execute o script novamente para corrigir.");
    } else {
      console.log("\n✅ Todos os números estão únicos agora!");
      console.log("O banco de dados está pronto para a migration.");
    }

    // 5. Estatísticas finais
    const totalPacientes = await prisma.paciente.count({
      where: {
        numeroProntuario: {
          not: null,
        },
      },
    });

    const maiorNumeroFinal = await prisma.paciente.findFirst({
      where: {
        numeroProntuario: {
          not: null,
        },
      },
      orderBy: {
        numeroProntuario: "desc",
      },
      select: {
        numeroProntuario: true,
      },
    });

    console.log("\n" + "-".repeat(60));
    console.log("Estatísticas finais:");
    console.log(`📊 Total de pacientes com número: ${totalPacientes}`);
    console.log(`🔢 Maior número de prontuário: ${maiorNumeroFinal?.numeroProntuario || "N/A"}`);

  } catch (error) {
    console.error("\n❌ Erro durante a correção:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar correção
fixDuplicateProntuarios()
  .then(() => {
    console.log("\n✅ Script executado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  });

