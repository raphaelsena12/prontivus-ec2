import { prisma } from "./prisma";

/**
 * Custo fixo estimado para features que NÃO retornam usage da API.
 * Whisper e Realtime não informam total_tokens na resposta.
 */
const FIXED_COSTS: Record<string, number> = {
  "transcribe": 10,
  "transcribe-realtime": 15,
};

/**
 * Margem mínima de tokens para permitir uma nova chamada de IA.
 * Evita bloquear por causa de 1 token restante.
 */
const MIN_TOKENS_TO_ALLOW = 5;

interface TokenCheckResult {
  allowed: boolean;
  clinicaId: string;
  tokensDisponiveis: number;
  tokensConsumidos: number;
}

/**
 * Verifica se a clínica tem tokens disponíveis.
 */
export async function checkTokens(clinicaId: string): Promise<TokenCheckResult> {
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: {
      tokensMensaisDisponiveis: true,
      tokensConsumidos: true,
    },
  });

  if (!clinica) {
    return { allowed: false, clinicaId, tokensDisponiveis: 0, tokensConsumidos: 0 };
  }

  const restante = clinica.tokensMensaisDisponiveis - clinica.tokensConsumidos;

  return {
    allowed: restante >= MIN_TOKENS_TO_ALLOW,
    clinicaId,
    tokensDisponiveis: clinica.tokensMensaisDisponiveis,
    tokensConsumidos: clinica.tokensConsumidos,
  };
}

/**
 * Consome tokens da clínica usando o total_tokens REAL retornado pela API OpenAI.
 * Para features sem usage (Whisper, Realtime), usa custo fixo estimado.
 */
export async function consumeTokens(
  clinicaId: string,
  feature: string,
  realUsage?: number
): Promise<void> {
  const custo = realUsage ?? FIXED_COSTS[feature] ?? 10;

  await prisma.tenant.update({
    where: { id: clinicaId },
    data: {
      tokensConsumidos: { increment: custo },
    },
  });

  console.log(`🪙 Tokens consumidos: ${custo}${realUsage ? " (real)" : " (estimado)"} [${feature}] — clínica ${clinicaId}`);
}
