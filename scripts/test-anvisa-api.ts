#!/usr/bin/env tsx
/**
 * Script de teste da API de Medicamentos ANVISA
 *
 * Uso:
 *   npm run test:anvisa
 *   ou
 *   tsx scripts/test-anvisa-api.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

async function testEndpoint(
  name: string,
  url: string,
  method: string = "GET",
  body?: any
): Promise<TestResult> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      name,
      success: response.ok,
      message: response.ok
        ? `✅ Sucesso (${response.status})`
        : `❌ Erro (${response.status}): ${data.error || data.message || "Erro desconhecido"}`,
      data: response.ok ? data : undefined,
    };
  } catch (error) {
    return {
      name,
      success: false,
      message: `❌ Erro de conexão: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("Testes da API de Medicamentos ANVISA");
  console.log("=".repeat(60));
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log("");

  const tests: TestResult[] = [];

  // Teste 1: Status da base
  console.log("1. Testando status da base...");
  const statusTest = await testEndpoint(
    "Status da Base",
    `${API_BASE_URL}/api/anvisa/sync/status`
  );
  tests.push(statusTest);
  console.log(`   ${statusTest.message}`);
  if (statusTest.data) {
    console.log(`   Total de medicamentos: ${statusTest.data.totalMedicamentos || 0}`);
  }
  console.log("");

  // Teste 2: Busca geral (sem termo)
  console.log("2. Testando busca geral (sem termo)...");
  const searchAllTest = await testEndpoint(
    "Busca Geral",
    `${API_BASE_URL}/api/anvisa/medicamentos?limit=5`
  );
  tests.push(searchAllTest);
  console.log(`   ${searchAllTest.message}`);
  if (searchAllTest.data?.medicamentos) {
    console.log(`   Encontrados: ${searchAllTest.data.medicamentos.length} medicamentos`);
  }
  console.log("");

  // Teste 3: Busca por nome
  console.log("3. Testando busca por nome (dipirona)...");
  const searchNomeTest = await testEndpoint(
    "Busca por Nome",
    `${API_BASE_URL}/api/anvisa/medicamentos?search=dipirona&tipo=nome&limit=5`
  );
  tests.push(searchNomeTest);
  console.log(`   ${searchNomeTest.message}`);
  if (searchNomeTest.data?.medicamentos) {
    console.log(`   Encontrados: ${searchNomeTest.data.medicamentos.length} medicamentos`);
    if (searchNomeTest.data.medicamentos.length > 0) {
      const first = searchNomeTest.data.medicamentos[0];
      console.log(`   Exemplo: ${first.nomeProduto} (${first.numeroRegistro})`);
    }
  }
  console.log("");

  // Teste 4: Busca por princípio ativo
  console.log("4. Testando busca por princípio ativo (paracetamol)...");
  const searchPrincipioTest = await testEndpoint(
    "Busca por Princípio Ativo",
    `${API_BASE_URL}/api/anvisa/medicamentos?search=paracetamol&tipo=principio-ativo&limit=5`
  );
  tests.push(searchPrincipioTest);
  console.log(`   ${searchPrincipioTest.message}`);
  if (searchPrincipioTest.data?.medicamentos) {
    console.log(`   Encontrados: ${searchPrincipioTest.data.medicamentos.length} medicamentos`);
  }
  console.log("");

  // Teste 5: Busca geral (termo qualquer)
  console.log("5. Testando busca geral (aspirina)...");
  const searchGeralTest = await testEndpoint(
    "Busca Geral",
    `${API_BASE_URL}/api/anvisa/medicamentos?search=aspirina&limit=5`
  );
  tests.push(searchGeralTest);
  console.log(`   ${searchGeralTest.message}`);
  if (searchGeralTest.data?.medicamentos) {
    console.log(`   Encontrados: ${searchGeralTest.data.medicamentos.length} medicamentos`);
  }
  console.log("");

  // Resumo
  console.log("=".repeat(60));
  console.log("Resumo dos Testes");
  console.log("=".repeat(60));
  const passed = tests.filter((t) => t.success).length;
  const failed = tests.filter((t) => !t.success).length;

  tests.forEach((test) => {
    console.log(`${test.success ? "✅" : "❌"} ${test.name}: ${test.message}`);
  });

  console.log("");
  console.log(`Total: ${tests.length} testes`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);

  if (failed > 0) {
    console.log("");
    console.log("⚠️  Nota: Se os testes falharam, pode ser que:");
    console.log("   1. O servidor não esteja rodando (npm run dev)");
    console.log("   2. A sincronização ainda não foi executada (npm run sync:anvisa)");
    console.log("   3. A base de dados esteja vazia");
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runTests().catch((error) => {
  console.error("Erro ao executar testes:", error);
  process.exit(1);
});
