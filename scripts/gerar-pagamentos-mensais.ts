/**
 * Script para gerar pagamentos mensais automaticamente
 * Execute este script diariamente via cron job ou agendador de tarefas
 * 
 * Exemplo de uso com cron:
 * 0 0 * * * cd /path/to/project && npm run script:gerar-pagamentos
 */

import "dotenv/config";
import { gerarPagamentosMensais, suspenderClinicasVencidas } from "../lib/pagamento-service";

async function main() {
  console.log("🔄 Iniciando geração de pagamentos mensais...");

  try {
    // Gerar pagamentos para clínicas que precisam pagar
    const pagamentosGerados = await gerarPagamentosMensais();
    console.log(`✅ ${pagamentosGerados.length} pagamento(s) gerado(s)`);

    // Suspender clínicas com pagamento vencido há mais de 7 dias
    console.log("🔄 Verificando clínicas vencidas...");
    const clinicasSuspensas = await suspenderClinicasVencidas(7);
    console.log(`⚠️ ${clinicasSuspensas.length} clínica(s) suspensa(s)`);

    if (clinicasSuspensas.length > 0) {
      console.log("Clínicas suspensas:");
      clinicasSuspensas.forEach((c) => {
        console.log(`  - ${c.nome} (ID: ${c.clinicaId})`);
      });
    }

    console.log("✅ Processo concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao executar script:", error);
    process.exit(1);
  }
}

main();















