import { gerarEmailFooter, gerarEstilosBase, gerarEstilosFooter } from './email-footer';

interface PagamentoSucessoEmailData {
  nomeClinica: string;
  plano: string;
  dataRenovacao: string;
  loginUrl: string;
  baseUrl?: string;
}

/**
 * Gera o HTML do email de pagamento bem-sucedido / conta reativada
 */
export function gerarEmailPagamentoSucesso(
  data: PagamentoSucessoEmailData
): string {
  const { nomeClinica, plano, dataRenovacao, loginUrl } = data;
  const baseUrl = data.baseUrl || 'https://prontivus.com';
  const logoUrl = `${baseUrl}/LogotipoemFundoTransparente.webp`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pagamento Confirmado - Prontivus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    ${gerarEstilosBase()}
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f7fa;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f5f7fa;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .email-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 40px 30px;
      text-align: center;
    }
    .header-icon {
      width: 80px;
      height: 80px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }
    .email-header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      margin: 0;
    }
    .email-body {
      padding: 40px;
    }
    .greeting {
      font-size: 18px;
      color: #1a1a1a;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .greeting strong {
      color: #1a1a1a;
      font-weight: 600;
    }
    .content-text {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .success-card {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 32px;
      margin: 32px 0;
      text-align: center;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .success-title {
      font-size: 20px;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 8px;
    }
    .success-text {
      font-size: 14px;
      color: #047857;
      line-height: 1.6;
    }
    .info-card {
      background-color: #f7fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #4a5568;
      min-width: 160px;
      font-size: 14px;
    }
    .info-value {
      color: #1a1a1a;
      flex: 1;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, oklch(0.25 0.08 250) 0%, oklch(0.3 0.1 250) 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 32px 0;
    }
    ${gerarEstilosFooter()}
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      .email-header {
        padding: 30px 20px 20px;
      }
      .email-header h1 {
        font-size: 24px;
      }
      .email-body {
        padding: 30px 20px;
      }
      .info-row {
        flex-direction: column;
        gap: 4px;
      }
      .info-label {
        min-width: auto;
      }
      .button {
        padding: 14px 32px;
        font-size: 15px;
        display: block;
        width: 100%;
      }
      .email-footer {
        padding: 24px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <img src="${logoUrl}" alt="Prontivus" class="logo" />
      </div>
      
      <!-- Body -->
      <div class="email-body">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Pagamento Confirmado!</h1>
        
        <p class="greeting">Olá, <strong>${nomeClinica}</strong>!</p>
        
        <p class="content-text">
          Confirmamos o recebimento do pagamento da sua assinatura do Prontivus. 
          Sua conta está ativa novamente e você pode continuar utilizando todos os recursos do sistema.
        </p>
        
        <div class="success-card">
          <div class="success-icon">✅</div>
          <div class="success-title">Sua conta foi reativada!</div>
          <div class="success-text">
            Todos os recursos do seu plano estão disponíveis novamente.
          </div>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Plano:</span>
            <span class="info-value">${plano}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data de renovação:</span>
            <span class="info-value">${dataRenovacao}</span>
          </div>
        </div>
        
        <div class="button-container">
          <a href="${loginUrl}" class="button" style="color: #ffffff;">Acessar Minha Conta</a>
        </div>
        
        <div class="divider"></div>
        
        <p class="content-text" style="font-size: 14px; color: #718096; margin-bottom: 0;">
          Obrigado por continuar confiando no Prontivus para a gestão da sua clínica. 
          Se tiver alguma dúvida, estamos à disposição.
        </p>
      </div>
      
      ${gerarEmailFooter(baseUrl)}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Gera a versão texto do email de pagamento bem-sucedido
 */
export function gerarEmailPagamentoSucessoTexto(
  data: PagamentoSucessoEmailData
): string {
  const { nomeClinica, plano, dataRenovacao, loginUrl } = data;

  return `
PAGAMENTO CONFIRMADO - PRONTIVUS
=================================

Olá, ${nomeClinica},

Confirmamos o recebimento do pagamento da sua assinatura do Prontivus. 
Sua conta está ativa novamente e você pode continuar utilizando todos os recursos do sistema.

═══════════════════════════════════════
✅ SUA CONTA FOI REATIVADA!
═══════════════════════════════════════
Todos os recursos do seu plano estão disponíveis novamente.

═══════════════════════════════════════
DETALHES
═══════════════════════════════════════
Plano: ${plano}
Data de renovação: ${dataRenovacao}

Acesse sua conta: ${loginUrl}

Obrigado por continuar confiando no Prontivus para a gestão da sua clínica. 
Se tiver alguma dúvida, estamos à disposição.

Suporte: suporte@prontivus.com

---
Este é um email automático. Por favor, não responda a esta mensagem.

© ${new Date().getFullYear()} Prontivus. Todos os direitos reservados.
  `.trim();
}
