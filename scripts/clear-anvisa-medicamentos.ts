import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Script para apagar todos os medicamentos sincronizados da ANVISA
 * Remove apenas medicamentos que têm numeroRegistro preenchido
 */
async function main() {
  try {
    console.log("🗑️  Iniciando limpeza de medicamentos da ANVISA...");

    // Contar quantos medicamentos serão deletados
    const count = await prisma.medicamento.count({
      where: {
        numeroRegistro: {
          not: null,
        },
      },
    });

    console.log(`📊 Encontrados ${count} medicamentos da ANVISA para deletar`);

    if (count === 0) {
      console.log("✅ Nenhum medicamento da ANVISA encontrado. Nada a fazer.");
      return;
    }

    // Deletar todos os medicamentos com numeroRegistro
    const result = await prisma.medicamento.deleteMany({
      where: {
        numeroRegistro: {
          not: null,
        },
      },
    });

    console.log(`✅ ${result.count} medicamentos da ANVISA foram deletados com sucesso!`);
    console.log("🔄 Agora você pode sincronizar novamente usando o botão 'Integração Anvisa'");
  } catch (error) {
    console.error("❌ Erro ao deletar medicamentos da ANVISA:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ Script concluído com sucesso");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro fatal:", error);
      process.exit(1);
    });
}

export { main };
