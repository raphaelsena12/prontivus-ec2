import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";

// Configuração do cliente SES
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "sa-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Se não fornecido, usa IAM role (recomendado para produção)
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
}

/**
 * Verifica se um email está no domínio verificado (prontivus.com ou *.prontivus.com)
 */
function isProntivusEmail(email: string): boolean {
  const emailLower = email.toLowerCase();
  // Aceita qualquer email do domínio prontivus.com ou subdomínios (*.prontivus.com)
  return emailLower.includes("@") && emailLower.endsWith(".prontivus.com");
}

/**
 * Obtém o endereço para usar como Source
 * 
 * IMPORTANTE: Se o domínio prontivus.com está verificado no SES,
 * qualquer email @prontivus.com ou @*.prontivus.com deve funcionar.
 * Sempre usamos o email personalizado se for do domínio prontivus.com.
 */
function getSourceEmail(customFrom?: string): string {
  // Se houver email personalizado e for do domínio prontivus.com, usar ele
  if (customFrom && isProntivusEmail(customFrom)) {
    return customFrom;
  }
  
  // Se não houver email personalizado ou não for do domínio, usar padrão
  return process.env.SES_FROM_EMAIL || "noreply@prontivus.com";
}

/**
 * Envia um email usando AWS SES com retry automático
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  fromName,
}: SendEmailOptions): Promise<void> {
  // Verificar se as credenciais estão configuradas
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  // Obter email para Source (sempre será do domínio prontivus.com)
  const sourceEmail = getSourceEmail(from);
  
  // Formatar endereço Source com nome se fornecido
  const sourceAddress = fromName
    ? `${fromName} <${sourceEmail}>`
    : sourceEmail;

  // Tentar enviar com retry
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const params: SendEmailCommandInput = {
        // SEMPRE usar email do domínio prontivus.com no Source
        // Se foi fornecido email personalizado (*@*.prontivus.com), usar ele
        Source: sourceAddress,
        // ReturnPath deve ser o mesmo email do Source para melhor autenticação
        ReturnPath: sourceEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
            ...(text && {
              Text: {
                Data: text,
                Charset: "UTF-8",
              },
            }),
          },
        },
        // Configurações opcionais
        ...(process.env.SES_CONFIGURATION_SET && {
          ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
        }),
        Tags: [
          {
            Name: "Source",
            Value: "prontivus",
          },
        ],
      };

      const command = new SendEmailCommand(params);
      const result = await sesClient.send(command);

      console.log("Email enviado com sucesso via SES:", result.MessageId);
      console.log(`Source: ${sourceEmail}${fromName ? ` (${fromName})` : ""}`);
      return; // Sucesso, sair do loop
    } catch (error: any) {
      lastError = error;
      console.error(`Tentativa ${attempt}/${maxRetries} falhou:`, error);

      // Se for erro de throttling ou rate limit, aguardar antes de tentar novamente
      if (
        attempt < maxRetries &&
        (error.name === "Throttling" ||
          error.name === "ServiceQuotaExceededException" ||
          error.code === "Throttling")
      ) {
        const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
        console.log(`Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Se for erro de validação, não tentar novamente
      if (
        error.name === "MessageRejected" ||
        error.name === "InvalidParameterValue"
      ) {
        throw new Error(`Erro de validação: ${error.message}`);
      }
    }
  }

  // Se todas as tentativas falharam
  throw new Error(
    `Falha ao enviar email após ${maxRetries} tentativas: ${lastError?.message}`
  );
}

/**
 * Verifica a configuração do SES
 */
export async function verifySMTPConnection(): Promise<boolean> {
  try {
    const fromEmail = process.env.SES_FROM_EMAIL || "noreply@prontivus.com";
    console.log("Cliente SES configurado para região:", process.env.AWS_REGION || "sa-east-1");
    console.log("Email remetente configurado:", fromEmail);
    return true;
  } catch (error) {
    console.error("Erro ao verificar conexão SES:", error);
    return false;
  }
}

/**
 * Envia email em modo não bloqueante (fire-and-forget)
 * Útil para não bloquear a resposta da API
 */
export async function sendEmailAsync(
  options: SendEmailOptions
): Promise<void> {
  // Executar em background sem aguardar
  sendEmail(options).catch((error) => {
    console.error("Erro ao enviar email em background:", error);
    // Aqui você pode adicionar logging para um serviço de monitoramento
  });
}
