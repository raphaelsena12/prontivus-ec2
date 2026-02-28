#!/usr/bin/env tsx
/**
 * Script de sincronização de medicamentos da ANVISA
 *
 * Uso:
 *   npm run sync:anvisa
 *   ou
 *   tsx scripts/sync-anvisa-medicamentos.ts
 *
 * Este script:
 * - Baixa o CSV oficial da ANVISA
 * - Processa e faz UPSERT no banco de dados
 * - É idempotente (pode ser executado múltiplas vezes)
 * - Trata erros e falhas de rede
 */

import { AnvisaSyncService } from "@/lib/anvisa/sync-service";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("=".repeat(60));
  console.log("Sincronização de Medicamentos ANVISA");
  console.log("=".repeat(60));
  console.log("");

  try {
    const syncService = new AnvisaSyncService();

    console.log("Iniciando sincronização...");
    console.log("");

    const result = await syncService.sync();

    console.log("");
    console.log("=".repeat(60));
    console.log("Resultado da Sincronização");
    console.log("=".repeat(60));
    console.log(`Status: ${result.success ? "✅ SUCESSO" : "⚠️  CONCLUÍDO COM ERROS"}`);
    console.log(`Total processado: ${result.totalProcessed}`);
    console.log(`Inseridos: ${result.totalInserted}`);
    console.log(`Atualizados: ${result.totalUpdated}`);
    console.log(`Erros: ${result.totalErrors}`);
    console.log(`Duração: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log("");
      console.log("Primeiros erros encontrados:");
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... e mais ${result.errors.length - 10} erros`);
      }
    }

    console.log("");
    console.log("=".repeat(60));

    // Exit code baseado no sucesso
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("");
    console.error("❌ ERRO FATAL na sincronização:");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    process.exit(1);
  } finally {
    // Garantir que o Prisma desconecte
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

export { main };
