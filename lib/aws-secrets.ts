import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRET_NAME = process.env.AWS_SECRET_NAME || "prontivus/production";
const REGION = process.env.AWS_REGION || "sa-east-1";

/**
 * Carrega os secrets do AWS Secrets Manager e injeta no process.env.
 * Deve ser chamado ANTES de qualquer import do Next.js ou Prisma.
 *
 * Em desenvolvimento (sem IAM Role / sem secret configurado), pula silenciosamente
 * e usa o .env local normalmente.
 */
export async function loadSecrets(): Promise<void> {
  // Em desenvolvimento, usar .env local
  if (process.env.NODE_ENV !== "production") {
    console.log("[Secrets] Ambiente de desenvolvimento — usando .env local");
    return;
  }

  // Se já tem DATABASE_URL preenchido (via .env manual), pular
  // Permite rollback fácil: basta manter o .env no servidor
  if (process.env.SKIP_SECRETS_MANAGER === "true") {
    console.log("[Secrets] SKIP_SECRETS_MANAGER=true — usando .env local");
    return;
  }

  try {
    console.log(`[Secrets] Carregando secrets de '${SECRET_NAME}' (${REGION})...`);

    const client = new SecretsManagerClient({
      region: REGION,
      // Em EC2 com IAM Role, as credenciais são obtidas automaticamente.
      // Não precisa passar accessKeyId/secretAccessKey.
    });

    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("Secret está vazio");
    }

    const secrets: Record<string, string> = JSON.parse(response.SecretString);

    // Injetar cada variável no process.env
    // NÃO sobrescreve variáveis já definidas (permite override local via .env)
    let loaded = 0;
    for (const [key, value] of Object.entries(secrets)) {
      if (!process.env[key]) {
        process.env[key] = value;
        loaded++;
      }
    }

    console.log(`[Secrets] ${loaded} variáveis carregadas do Secrets Manager`);
  } catch (error: any) {
    // Se não conseguir carregar, logar o erro mas não derrubar a aplicação
    // Isso permite que o .env local funcione como fallback
    console.error(`[Secrets] Erro ao carregar secrets: ${error.message}`);
    console.error("[Secrets] A aplicação tentará usar variáveis do .env local como fallback");
  }
}
